#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>
#include "xtimer.h"
#include "fmt.h"

#include "periph/gpio.h"
#include "srf04.h"
#include "srf04_params.h"

//Networking
#include "msg.h"
#include "net/emcute.h"
#include "net/ipv6/addr.h"

//Networking
#define _IPV6_DEFAULT_PREFIX_LEN        (64U)

//Emcute
#define EMCUTE_PRIO         (THREAD_PRIORITY_MAIN - 1)
#define NUMOFSUBS           (16U)
#define TOPIC_MAXLEN        (64U)

static emcute_sub_t subscriptions[NUMOFSUBS];
static char stack[THREAD_STACKSIZE_MAIN];

//Dev fast forward
#if (FF!=0)
#define SLEEP 1 //If FF is set to 1 the device will sllep 1 sec between measurements
#else
#define SLEEP 60*10 //Nominal 10 min sleep beween measurements
#endif

//Samples to take each time we sense
#define SAMPLES 10
//No of ultrasonic sensor used
#define SENSORS 2
//When to send data
#define ROUNDS 10
//Undefine to make parallel mesurements (experimenting)
#define SERIAL 1

#define LOW_PERCENTILE 0.25
#define HIGH_PERCENTILE 0.75

//Structure definition to store ref values
typedef struct refer{
    int low;
    int high;
} refer;

//State machine states enumeration
typedef enum state {
    STANDBY, REFERENCE, SAMPLING, CLEAN, SEND
}state;

//Current state
state curr_state = REFERENCE;


gpio_t trigger[] = {GPIO_PIN(PORT_A, 10)/*D2*/, GPIO_PIN(PORT_B, 3)/*D3*/};//, GPIO_PIN(PORT_B, 5)/*D4*/};
gpio_t echo[] = {GPIO_PIN(PORT_B, 4)/*D5*/, GPIO_PIN(PORT_B, 10)/*D6*/};//,GPIO_PIN(PORT_A, 8)/*D7*/};
srf04_t dev[SENSORS];


static void on_pub(const emcute_topic_t *topic, void *data, size_t len){
    char *in = (char *)data;
    printf("### got publication for topic '%s' [%i] ###\n",
           topic->name, (int)topic->id);
    //Parse input and set led
    for (size_t i = 0; i < len; i++) {
        printf("%c", in[i]);
    }
    puts("");

}

static void *emcute_thread(void *arg)
{
    (void)arg;
    emcute_run(CONFIG_EMCUTE_DEFAULT_PORT, EMCUTE_ID);
    return NULL;    /* should never be reached */
}

/********* NETWORK RELATED PART *********/ 
static uint8_t get_prefix_len(char *addr)
{
    int prefix_len = ipv6_addr_split_int(addr, '/', _IPV6_DEFAULT_PREFIX_LEN);

    if (prefix_len < 1) {
        prefix_len = _IPV6_DEFAULT_PREFIX_LEN;
    }

    return prefix_len;
}

static int netif_add(char *iface_name,char *addr_str)
{

    netif_t *iface = netif_get_by_name(iface_name);
        if (!iface) {
            puts("error: invalid interface given");
            return 1;
        }
    enum {
        _UNICAST = 0,
        _ANYCAST
    } type = _UNICAST;
    
    ipv6_addr_t addr;
    uint16_t flags = GNRC_NETIF_IPV6_ADDRS_FLAGS_STATE_VALID;
    uint8_t prefix_len;


    prefix_len = get_prefix_len(addr_str);

    if (ipv6_addr_from_str(&addr, addr_str) == NULL) {
        puts("error: unable to parse IPv6 address.");
        return 1;
    }

    if (ipv6_addr_is_multicast(&addr)) {
        if (netif_set_opt(iface, NETOPT_IPV6_GROUP, 0, &addr,
                          sizeof(addr)) < 0) {
            printf("error: unable to join IPv6 multicast group\n");
            return 1;
        }
    }
    else {
        if (type == _ANYCAST) {
            flags |= GNRC_NETIF_IPV6_ADDRS_FLAGS_ANYCAST;
        }
        flags |= (prefix_len << 8U);
        if (netif_set_opt(iface, NETOPT_IPV6_ADDR, flags, &addr,
                          sizeof(addr)) < 0) {
            printf("error: unable to add IPv6 address\n");
            return 1;
        }
    }

    printf("success: added %s/%d to interface ", addr_str, prefix_len);
    printf("\n");

    return 0;

}
/********* NETWORK RELATED PART END *********/ 

int setup_mqtt(void)
{
    /* initialize our subscription buffers */
    memset(subscriptions, 0, (NUMOFSUBS * sizeof(emcute_sub_t)));

    /* start the emcute thread */
    thread_create(stack, sizeof(stack), EMCUTE_PRIO, 0, emcute_thread, NULL, "emcute");
    //Adding address to network interface
    netif_add("4","fec0:affe::99");
    // connect to MQTT-SN broker
    printf("Connecting to MQTT-SN broker %s port %d.\n", SERVER_ADDR, SERVER_PORT);

    sock_udp_ep_t gw = {
        .family = AF_INET6,
        .port = SERVER_PORT
    };
    
    /* parse address */
    if (ipv6_addr_from_str((ipv6_addr_t *)&gw.addr.ipv6, SERVER_ADDR) == NULL) {
        printf("error parsing IPv6 address\n");
        return 1;
    }

    if (emcute_con(&gw, true, NULL, NULL, 0, 0) != EMCUTE_OK) {
        printf("error: unable to connect to [%s]:%i\n", SERVER_ADDR, (int)gw.port);
        return 1;
    } else printf("Successfully connected to gateway at [%s]:%i\n", SERVER_ADDR, (int)gw.port);

    // setup subscription to topic
    
    unsigned flags = EMCUTE_QOS_0;
    subscriptions[0].cb = on_pub;

    subscriptions[0].topic.name = MQTT_TOPIC_IN;


    if (emcute_sub(&subscriptions[0], flags) != EMCUTE_OK) {
        printf("error: unable to subscribe to %s\n", MQTT_TOPIC_IN);
        return 1;
    }

    printf("Now subscribed to %s\n", MQTT_TOPIC_IN);
    
    return 0;
}

static int pub(char* topic, const char* data, int qos){
    emcute_topic_t t;
    unsigned flags = EMCUTE_QOS_0;

    switch(qos){
        case 1:
            flags |= EMCUTE_QOS_1;
            break;
        case 2:
            flags |= EMCUTE_QOS_2;
            break;
        default:
            flags |= EMCUTE_QOS_0;
            break;

    }

    t.name = topic;
    if(emcute_reg(&t) != EMCUTE_OK){
        printf("PUB ERROR: Unable to obtain Topic ID, %s",topic);
        return 1;
    }
    if(emcute_pub(&t, data, strlen(data), flags) != EMCUTE_OK){
        printf("PUB ERROR: unable to publish data to topic '%s [%i]'\n", t.name, (int)t.id);
        return 1;
    }

    printf("PUB SUCCESS: Published %s on topic %s\n", data, topic);
    return 0;
}

void init(void){
    srf04_params_t my_params[SENSORS];
    for(int i=0;i<SENSORS;i++){
        my_params[i].trigger = trigger[i];
        my_params[i].echo = echo[i];
    }
    for(int i=0;i<SENSORS;i++){
        if(srf04_init(&dev[i], &my_params[i]) != SRF04_OK){
            puts("Failed to setup SRF04");
        }
    }
    setup_mqtt();
}

int compare( const void *arg1, const void *arg2 )
{
    return arg1>arg2;
}

#ifndef SERIAL
void measure(int measures[SENSORS][SAMPLES]){
    puts("STARTING MEASUREMENTS");
    //Reads sensors values
    for(int j=0;j<SAMPLES;j++){
        for(int i=0;i<SENSORS;i++){
            srf04_trigger(&dev[i]);
        }
        xtimer_msleep(300);
        for(int i=0;i<SENSORS;i++){
            measures[i][j]=srf04_read(&dev[i]);
            printf("%d, ", measures[i][j]);
        }
        printf("\n");
        xtimer_sleep(2);
    }
}
#else
void measure(int measures[SENSORS][SAMPLES]){
    for(int j=0;j<SAMPLES;j++){
        for(int i=0;i<SENSORS;i++){
            srf04_trigger(&dev[i]);
            xtimer_msleep(300);
            measures[i][j]=srf04_read(&dev[i]);
            printf("%d, ", measures[i][j]);
            xtimer_sleep(2);
        }
        printf("\n");
    }
}
#endif

void reference(refer *refer){
    int measures[SENSORS][SAMPLES];
    measure(measures);
    for(int i=0;i<SENSORS;i++){
        qsort(measures[i],SAMPLES,sizeof(int),compare);
        refer[i].low=measures[i][(int)ceil(LOW_PERCENTILE*SAMPLES)];
        refer[i].high=measures[i][(int)ceil(HIGH_PERCENTILE*SAMPLES)];
    }
}

/* The sense method now checks if data from the sensor differs from reference stored values.
** In case it differs it returns that the flow in the pipe is the maximum value.
** A future implementation should look for the distance of the sensed value from either
** low and high percentiles to give the real value of flow in the pipe.
*/
int sense(refer *refer){
    int measures[SENSORS][SAMPLES];
    measure(measures);
    for(int i=0;i<SENSORS;i++){
        qsort(measures[i],SAMPLES,sizeof(int),compare);
        int median = measures[i][(int)ceil(0.5*SAMPLES)];
        if(median>refer[i].high || median<refer[i].low){
            return 100;
        }
    } return 0;
}

void send(int val){
    printf("VALUE: %d\n",val);
    char str[50];
    sprintf(str,"{\"id\":\"%s\",\"filling\":\"%d\"}",EMCUTE_ID,val);
    pub(MQTT_TOPIC_OUT,str,0);
}

int agg_flows(int *flows){
    qsort(flows,ROUNDS,sizeof(int),compare);
    return flows[(int)ceil(0.5*ROUNDS)];
}

int main(void){
    refer refer[SENSORS];
    int flows[ROUNDS];
    int round=0;
    init();
    while(1){
        switch(curr_state){
            case REFERENCE:
                puts("ENTER REFERENCE");
                reference(refer);
                puts("EXIT REFERENCE");
                curr_state=STANDBY;
                break;
            case SAMPLING:
                puts("ENTER SAMPLING");
                flows[round]=sense(refer);
                round++;
                puts("EXIT SAMPLING");
                if(round<ROUNDS)
                curr_state=STANDBY;
                else curr_state=SEND;
                break;
            case SEND:
                send(agg_flows(flows));
                curr_state=CLEAN;
                break;
            case CLEAN:
                round=0;
                curr_state=STANDBY;
                break;
            case STANDBY:
                puts("ENTER STANDBY");
                xtimer_sleep(SLEEP);
                puts("EXIT STANDBY");
                curr_state=SAMPLING;
                break;
        }
    }
}
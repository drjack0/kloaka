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
//#ifdef CONFIG_EMCUTE_BUFSIZE
//#undef CONFIG_EMCUTE_BUFSIZE
//#endif
//#define CONFIG_EMCUTE_BUFSIZE               (4800U)
static emcute_sub_t subscriptions[NUMOFSUBS];
static char stack[THREAD_STACKSIZE_MAIN];

#define P_OR_S 0 //true: parallel, false: serial
//No of ultrasonic sensor used
#define SENSORS 2

//Nr of measures
#define NR_MEASURES 10
#define NR_MEASURES_TRANSITION 10
//Times in ms
#define START 160
#define END 500
#define STEP 5
//State machine states enumeration
typedef enum state {
    OFF, OFF2ON, ON, ON2OFF, NEXT, CLEAN
}state;

typedef struct measures {
    bool type;
    int time;
    int off[NR_MEASURES][SENSORS];
    int off2on[NR_MEASURES_TRANSITION][SENSORS];
    int on[NR_MEASURES][SENSORS];
    int on2off[NR_MEASURES_TRANSITION][SENSORS];
}measures;

//Current state
state curr_state = OFF;
int curr_test_time = START; //ms

gpio_t trigger[] = {GPIO_PIN(PORT_A, 10)/*D2*/, GPIO_PIN(PORT_B, 3)/*D3*/};//, GPIO_PIN(PORT_B, 5)/*D4*/};
gpio_t echo[] = {GPIO_PIN(PORT_B, 4)/*D5*/, GPIO_PIN(PORT_B, 10)/*D6*/};//,GPIO_PIN(PORT_A, 8)/*D7*/};
gpio_t pump = GPIO_PIN(PORT_A, 9);
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
            //puts("error: invalid interface given");
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
        //puts("error: unable to parse IPv6 address.");
        return 1;
    }

    if (ipv6_addr_is_multicast(&addr)) {
        if (netif_set_opt(iface, NETOPT_IPV6_GROUP, 0, &addr,
                          sizeof(addr)) < 0) {
            //printf("error: unable to join IPv6 multicast group\n");
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
            //printf("error: unable to add IPv6 address\n");
            return 1;
        }
    }

    //printf("success: added %s/%d to interface ", addr_str, prefix_len);
    //printf("\n");

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
    //printf("Connecting to MQTT-SN broker %s port %d.\n", SERVER_ADDR, SERVER_PORT);

    sock_udp_ep_t gw = {
        .family = AF_INET6,
        .port = SERVER_PORT
    };
    
    /* parse address */
    if (ipv6_addr_from_str((ipv6_addr_t *)&gw.addr.ipv6, SERVER_ADDR) == NULL) {
        //printf("error parsing IPv6 address\n");
        return 1;
    }

    if (emcute_con(&gw, true, NULL, NULL, 0, 0) != EMCUTE_OK) {
        //printf("error: unable to connect to [%s]:%i\n", SERVER_ADDR, (int)gw.port);
        return 1;
    } else printf("Successfully connected to gateway at [%s]:%i\n", SERVER_ADDR, (int)gw.port);
    

    // setup subscription to topic
    
    unsigned flags = EMCUTE_QOS_0;
    subscriptions[0].cb = on_pub;

    subscriptions[0].topic.name = MQTT_TOPIC_IN;


    if (emcute_sub(&subscriptions[0], flags) != EMCUTE_OK) {
        //printf("error: unable to subscribe to %s\n", MQTT_TOPIC_IN);
        return 1;
    }

    //printf("Now subscribed to %s\n", MQTT_TOPIC_IN);
    
    return 0;
}

static int pub(char* topic, const char* data,int len, int qos){
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
        //printf("PUB ERROR: Unable to obtain Topic ID, %s",topic);
        return 1;
    }
    if(emcute_pub(&t, data, len, flags) != EMCUTE_OK){
        //printf("PUB ERROR: unable to publish data to topic '%s [%i]'\n", t.name, (int)t.id);
        return 1;
    }

    //printf("PUB SUCCESS: Published %s on topic %s\n", data, topic);
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
            //puts("Failed to setup SRF04");
        }
    }
    gpio_init(pump, GPIO_OUT);
    setup_mqtt();
}
#if (P_OR_S)
void measure(int measures[SENSORS]){
    //puts("STARTING MEASUREMENTS");
    //Reads sensors values
    for(int i=0;i<SENSORS;i++){
        srf04_trigger(&dev[i]);
    }
    xtimer_msleep(curr_test_time);
    for(int i=0;i<SENSORS;i++){
        measures[i]=srf04_read(&dev[i]);
        //printf("%d, ", measures[i]);
    }
    //printf("\n");
    //xtimer_sleep(2);
}
#else
//ONLY WORKS WITH TWO SENSORS
void measure(void){
    int measures[SENSORS];
    char buf[100];
    int length=0;
    for(int i=0;i<SENSORS;i++){
        srf04_trigger(&dev[i]);
        xtimer_msleep(curr_test_time);
        measures[i]=srf04_read(&dev[i]);
        //printf("%d, ", measures[i]);
        xtimer_msleep(100);
    }
    length=sprintf(buf,"%d;%d,%d",curr_test_time,measures[0],measures[1]);
    pub(MQTT_TOPIC_OUT,buf,length,0);
    //printf("\n");
}
#endif

int main(void){
    init();
    char time_to_s[10];
    int length=0;
    while(1){
        switch(curr_state){
            case OFF:
                puts("OFF");
                length=sprintf(time_to_s,"%d;OFF",curr_test_time);
                pub(MQTT_TOPIC_OUT,time_to_s,length,1);
                for(int i=0;i<NR_MEASURES;i++){
                    measure();
                }
                curr_state=OFF2ON;
                //Measure
                //Store
                //Next state
                break;
            case OFF2ON:
                puts("OFF2ON");
                gpio_set(pump);
                length=sprintf(time_to_s,"%d;OFF2ON",curr_test_time);
                pub(MQTT_TOPIC_OUT,time_to_s,length,1);
                for(int i=0;i<NR_MEASURES_TRANSITION;i++){
                    measure();
                }
                curr_state=ON;
                //Set relay gpio pin
                //Measure
                //Store
                //Next state
                break;
            case ON:
                puts("ON");
                length=sprintf(time_to_s,"%d;ON",curr_test_time);
                pub(MQTT_TOPIC_OUT,time_to_s,length,1);
                for(int i=0;i<NR_MEASURES;i++){
                    measure();
                }
                curr_state=ON2OFF;
                //Measure
                //Store
                //Next state
                break;
            case ON2OFF:
                puts("ON2OFF");
                gpio_clear(pump);
                length=sprintf(time_to_s,"%d;ON2OFF",curr_test_time);
                pub(MQTT_TOPIC_OUT,time_to_s,length,1);
                for(int i=0;i<NR_MEASURES_TRANSITION;i++){
                    measure();
                }
                curr_state=NEXT;
                //Clear relay gpio pin
                //Measure
                //Store
                //Next state
                break;
            case NEXT:
                //Increment delay time
                if (curr_test_time<END){
                    curr_test_time+=STEP;
                    curr_state=CLEAN;
                }
                else {
                    //puts("DONE");
                    return 0;
                }
                break;
            case CLEAN:
                curr_state=OFF;
                break;
                //Clean the stored values arrays before next test
                //Got to state OFF
        }
    }
}
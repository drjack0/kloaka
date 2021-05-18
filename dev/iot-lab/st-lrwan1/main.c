#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>
#include <math.h>

//Shell
#include "shell.h"

#include <string.h>

#include "board.h"
#include "xtimer.h"

#include "net/loramac.h"     /* core loramac definitions */
#include "semtech_loramac.h" /* package API */

#include "hts221.h"
#include "hts221_params.h"

#include "thread.h"
#define SLEEP 10 // Time in mins

#define RECV_MSG_QUEUE                   (4U)
static msg_t _recv_queue[RECV_MSG_QUEUE];
static char _recv_stack[THREAD_STACKSIZE_DEFAULT];

static semtech_loramac_t loramac;  /* The loramac stack descriptor */

static hts221_t hts221; /* The HTS221 device descriptor */

static const uint8_t deveui[LORAMAC_DEVEUI_LEN] = { 0x12, 0x34, 0x56, 0x78, 0x91, 0x01, 0x12, 0x31 };
static const uint8_t appeui[LORAMAC_APPEUI_LEN] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
static const uint8_t appkey[LORAMAC_APPKEY_LEN] = { 0x91, 0xBC, 0x14, 0xEA, 0x75, 0x03, 0x65, 0x4D, 0x85, 0x68, 0xC4, 0xC5, 0xEA, 0x7C, 0xCD, 0x70 };

static char encoding_table[] = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
                                'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
                                'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
                                'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
                                'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                                'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
                                'w', 'x', 'y', 'z', '0', '1', '2', '3',
                                '4', '5', '6', '7', '8', '9', '+', '/'};
static int mod_table[] = {0, 2, 1};

char *base64_encode(const char *data,
                    size_t input_length,
                    size_t *output_length) {

    *output_length = 4 * ((input_length + 2) / 3);

    char *encoded_data = malloc(*output_length);
    if (encoded_data == NULL) return NULL;

    for (size_t i = 0, j = 0; i < input_length;) {

        uint32_t octet_a = i < input_length ? (unsigned char)data[i++] : 0;
        uint32_t octet_b = i < input_length ? (unsigned char)data[i++] : 0;
        uint32_t octet_c = i < input_length ? (unsigned char)data[i++] : 0;

        uint32_t triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

        encoded_data[j++] = encoding_table[(triple >> 3 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 2 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 1 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 0 * 6) & 0x3F];
    }

    for (int i = 0; i < mod_table[input_length % 3]; i++)
        encoded_data[*output_length - 1 - i] = '=';

    return encoded_data;
}

/* 
static char *decoding_table = NULL;
void build_decoding_table(void) {

    decoding_table = malloc(256);

    for (int i = 0; i < 64; i++)
        decoding_table[(unsigned char) encoding_table[i]] = i;
}


void base64_cleanup(void) {
    free(decoding_table);
}

unsigned char *base64_decode(const char *data,
                             size_t input_length,
                             size_t *output_length) {

    if (decoding_table == NULL) build_decoding_table();

    if (input_length % 4 != 0) return NULL;

    *output_length = input_length / 4 * 3;
    if (data[input_length - 1] == '=') (*output_length)--;
    if (data[input_length - 2] == '=') (*output_length)--;

    unsigned char *decoded_data = malloc(*output_length);
    if (decoded_data == NULL) return NULL;

    for (size_t i = 0, j = 0; i < input_length;) {

        uint32_t sextet_a = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t sextet_b = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t sextet_c = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t sextet_d = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];

        uint32_t triple = (sextet_a << 3 * 6)
        + (sextet_b << 2 * 6)
        + (sextet_c << 1 * 6)
        + (sextet_d << 0 * 6);

        if (j < *output_length) decoded_data[j++] = (triple >> 2 * 8) & 0xFF;
        if (j < *output_length) decoded_data[j++] = (triple >> 1 * 8) & 0xFF;
        if (j < *output_length) decoded_data[j++] = (triple >> 0 * 8) & 0xFF;
    }

    return decoded_data;
}  */



static void *_recv(void *arg)
{
   msg_init_queue(_recv_queue, RECV_MSG_QUEUE);
   (void)arg;
   while (1) {
       /* blocks until a message is received */
       semtech_loramac_recv(&loramac);
       loramac.rx_data.payload[loramac.rx_data.payload_len] = 0;
       printf("Data received: %s, port: %d\n",
              (char *)loramac.rx_data.payload, loramac.rx_data.port);
        
        /*
        char * msg = (char *)loramac.rx_data.payload;
        size_t inl = strlen(msg);
        printf("Trying to decode the message (len: %u )...\n", inl);

        size_t outl;
        //unsigned char* decoded =  base64_decode(msg, inl, &outl);
        
        printf("Result: ( %u )\n", outl);
        */
   }
   return NULL;
}

void send(int val){
    printf("VALUE: %d\n",val);
    char message[50];
    sprintf(message,"{\"id\":\"%s\",\"filling\":\"%d\"}",TTN_DEV_ID,val);
    

        printf("Sending message '%s'\n", message);

        size_t inl = strlen(message);
        size_t outl;
        printf("Trying to encode the message (len: %zu )...\n", inl);
        char* encoded = base64_encode(message, inl, &outl);
        printf("Result: %s (%zu )\n", encoded, outl);
        /* send the message here */
        if (semtech_loramac_send(&loramac,
                                 (uint8_t *)message, strlen(message)) != SEMTECH_LORAMAC_TX_DONE) {
            printf("Cannot send message '%s'\n", message);
        }
        else {
            printf("Message '%s' sent\n", message);
        }
}

int scheduled(int schedule[], int len){
    for(int i=0;i<len;i++){
        xtimer_sleep(SLEEP);
        send(schedule[i]);
    }
    puts("DONE");
    return 0;
}

static int cmd_flow(int argc, char **argv){
    int schedule[150];
    if(argc<2){
        printf("usage: %s <flow value>|[<flow value 1> <hold for mins 1> ... <flow value n><hold for mins n>]\n", argv[0]);
        return 1;
    }
    if(argc==2){
        send(atoi(argv[1]));
        printf("%s set to %d\n",argv[0],atoi(argv[1]));
    }
    if(argc>2){
        argv++;
        argc--;
        for(int i=0;i<argc;i++){
            schedule[i]=atoi(argv[i]);
        }
        scheduled(schedule,argc);
    }
    return 0;
}

int lora_init(void) {
        /* initialize the HTS221 sensor */
    if (hts221_init(&hts221, &hts221_params[0]) != HTS221_OK) {
        puts("Sensor initialization failed");
        return 1;
    }

    if (hts221_power_on(&hts221) != HTS221_OK) {
        puts("Sensor initialization power on failed");
        return 1;
    }

    if (hts221_set_rate(&hts221, hts221.p.rate) != HTS221_OK) {
        puts("Sensor continuous mode setup failed");
        return 1;
    }

    /* initialize the loramac stack */
    semtech_loramac_init(&loramac);
    
    /* configure the device parameters */
    semtech_loramac_set_deveui(&loramac, deveui);
    semtech_loramac_set_appeui(&loramac, appeui);
    semtech_loramac_set_appkey(&loramac, appkey);

    /* change datarate to DR5 (SF7/BW125kHz) */
    semtech_loramac_set_dr(&loramac, 5);
    
    /* start the OTAA join procedure */
    if (semtech_loramac_join(&loramac, LORAMAC_JOIN_OTAA) != SEMTECH_LORAMAC_JOIN_SUCCEEDED) {
        puts("Join procedure failed");
        return 1;
    }
    puts("Join procedure succeeded");

    return 0;
}

static const shell_command_t shell_commands[] = {
    { "flow", "set the device's current flow", cmd_flow },
    { NULL, NULL, NULL }};

int main(void){
    lora_init();
    thread_create(_recv_stack, sizeof(_recv_stack),
               THREAD_PRIORITY_MAIN - 1, 0, _recv, NULL, "recv thread");    
    /* start shell */
    char line_buf[SHELL_DEFAULT_BUFSIZE];
    shell_run(shell_commands, line_buf, SHELL_DEFAULT_BUFSIZE);
    //base64_cleanup();
    return 0;
}
'use strict';

//var vConsole = new VConsole();

var noble;
let obniz;

var timer = null;
var devices = [];
const NUM_OF_DATA = 50;
const UPDATE_INTERVAL = 1000;
const LOST_INTERVAL = 5000;
const COOKIE_EXPIRE = 365;

var vue_options = {
    el: "#top",
    data: {
        progress_title: '',

        obniz_id: '',
        device: null,
        num_of_data: NUM_OF_DATA,
        update_interval: UPDATE_INTERVAL,
        lost_interval: LOST_INTERVAL,
        obniz_connected: false,
        display_width: 0,
        display_height: 0,
        display_context: null,
        is_m5stickc: false,
    },
    computed: {
    },
    methods: {
        obniz_connect: function(){
            noble = obnizNoble(this.obniz_id);
            this.progress_open('接続試行中', true);

            noble.on('stateChange', (state) => {
                this.progress_close();
                if (state === 'poweredOn') {
                    Cookies.set('obniz_id', this.obniz_id, { expires: COOKIE_EXPIRE });
                    this.obniz_connected = true;
                    noble.startScanning([], true);
    
                    this.interval_change();
                } else {
                    this.obniz_connected = false;
                    noble.stopScanning();
                }
            });
    
            noble.on('discover', (peripheral) => {
                var device = devices.find(item => item.peripheral.address == peripheral.address);
                if( device ){
//                    device.peripheral = peripheral;
                    device.peripheral.rssi = peripheral.rssi;
                    device.counter = 0;
                }else{
//                    var peri = peripheral;
                    var peri = {
                        address: peripheral.address,
                        addressType: peripheral.addressType,
                        connectable: peripheral.connectable,
                        advertisement: {
                            serviceUuids: peripheral.advertisement.serviceUuids,
                            manufacturerData: peripheral.advertisement.manufacturerData,
                            localName: peripheral.advertisement.localName,
                            txPowerLevel: peripheral.advertisement.txPowerLevel,
                        },
                        rssi: peripheral.rssi,
                    };
                    devices.push({
                        peripheral: peri,
                        display: "display",
                        datasets: [],
                        counter: 0,
                    });
                }
            });

            if( this.is_m5stickc ){
                obniz = new M5StickC(this.obniz_id, {local_connect: false});
                obniz.onconnect = async () =>{
                    await obniz.wait(100);
                    await obniz.m5display.onWait();

                    this.display_width = obniz.m5display.width;
                    this.display_height = obniz.m5display.height;

                    this.display_context = obniz.util.createCanvasContext(this.display_width, this.display_height);
                    this.display_context.fillStyle = "white";
                    this.display_context.font = "20px Avenir";
                    this.display_context.translate(this.display_width / 2, this.display_height / 2);
                    this.display_context.rotate(Math.PI / 2);
                    this.display_context.translate(-this.display_height / 2, -this.display_width / 2);
                    this.display_context.fillText('hw:' + obniz.hw, 0, 20);
                    this.display_context.fillText('fw:' + obniz.firmware_ver, 0, 40);

                    await obniz.m5display.draw(this.display_context);
                };
            }
        },
        interval_change: function(){
            if( timer != null ){
                clearTimeout(timer);
                timer = null;
            }
            timer = setInterval(() =>{
                this.update_graph();
            }, this.update_interval);
        },
        async update_graph(){
            for( var i = 0 ; i < devices.length ; i++ ){
                if( devices[i].counter * this.update_interval < this.lost_interval ){
                    devices[i].datasets.unshift(devices[i].peripheral.rssi);
                    devices[i].counter++;
                }else{
                    devices[i].peripheral.rssi = NaN;
                    devices[i].datasets.unshift(NaN);
                }
            }

            var current_datasets = [];
            for( var i = 0 ; i < devices.length ; i++ ){
                current_datasets.push({
                    label: devices[i].peripheral.advertisement.localName || devices[i].peripheral.address,
                    data: [],
                    fill: false,
                    hidden: (devices[i].display != "display")
                });
            }

            if( current_datasets.length > 0 ){
                for( var i = 0 ; i < current_datasets.length ; i++ ){
                    for( var j = 0 ; j < this.num_of_data ; j++ ){
                        if( j > devices[i].datasets.length ){
                            current_datasets[i].data[this.num_of_data - 1 - j] = NaN;
                        }else{
                            current_datasets[i].data[this.num_of_data - 1 - j] = devices[i].datasets[j];
                        }
                    }
                }
                var labels = [];
                for( var i = 0 ; i < this.num_of_data ; i++ ){
                    labels.push(i - this.num_of_data + 1);
                }
                myChart.data.datasets = current_datasets;
                myChart.data.labels = labels;

                myChart.update();
            }

            if( obniz && this.device != null ){
                this.display_context.clearRect(0, 0, this.display_height, this.display_width);

                this.display_context.font = "15px Avenir";
                var name = this.device.peripheral.advertisement.localName || this.device.peripheral.address;
                this.display_context.fillText(name, 0, 20);
                this.display_context.font = "40px Avenir";
                this.display_context.fillText(this.device.peripheral.rssi, 0, 65);

                await obniz.m5display.draw(this.display_context);            
            }
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        this.obniz_id = Cookies.get('obniz_id');
    }
};
vue_add_methods(vue_options, methods_utils);
var vue = new Vue( vue_options );

var myChart = new Chart( $('#chart')[0].getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options: {
        animation: false,
        scales: {
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'RSSI [dB]'
                }
            }]
        },
        legend: {
            position: "bottom",
            onClick: function(e, item){
                vue.device = devices[item.datasetIndex];
            }
        },
        plugins: {
            colorschemes: {
                scheme: 'brewer.Paired12'
            }
        }
    }
});

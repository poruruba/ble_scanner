'use strict';

//var vConsole = new VConsole();

var noble;

var devices = [];
const NUM_OF_DATA = 50;
const UPDATE_INTERVAL = 1000;
var timer = null;

var vue_options = {
    el: "#top",
    data: {
        progress_title: '',

        obniz_id: '',
        device: null,
        num_of_data: NUM_OF_DATA,
        update_interval: UPDATE_INTERVAL,
        obniz_connected: false,
    },
    computed: {
    },
    methods: {
        obniz_connect: function(){
            noble = obnizNoble(this.obniz_id);

            noble.on('stateChange', (state) => {
                if (state === 'poweredOn') {
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
    //                device.peripheral = peripheral;
                    device.peripheral.rssi = peripheral.rssi;
                }else{
    //                var peri = peripheral;
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
                        datasets: []
                    });
                }
            });
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
        update_graph(){
            for( var i = 0 ; i < devices.length ; i++ ){
                devices[i].datasets.unshift(devices[i].peripheral.rssi);
            }

            var current_datasets = [];
            for( var i = 0 ; i < devices.length ; i++ ){
                current_datasets.push({
                    label: devices[i].peripheral.advertisement.localName ? devices[i].peripheral.advertisement.localName : devices[i].peripheral.address,
                    data: [],
                    fill: false,
                    hidden: devices[i].display != "display" }
                );
            }

            if( current_datasets.length > 0 ){
                for( var i = 0 ; i < current_datasets.length ; i++ ){
                    for( var j = 0 ; j < this.num_of_data ; j++ ){
                        if( j > devices[i].datasets.length ){
                            current_datasets[i].data[this.num_of_data - 1 - j] = 0;
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
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();
    }
};
vue_add_methods(vue_options, methods_utils);
var vue = new Vue( vue_options );

var ctx = $('#chart')[0].getContext('2d');
var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options: {
        animation: false,
        scales: {
            yAxes: [{
                ticks: {
                    max: -1
                },
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
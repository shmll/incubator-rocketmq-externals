/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
app.controller('AppCtrl', ['$scope','$rootScope','$cookies','$location','$translate', function ($scope,$rootScope,$cookies,$location,$translate) {
    $scope.changeTranslate = function(langKey){
        $translate.use(langKey);
    }
}]);

app.controller('dashboardCtrl', ['$scope','$rootScope','$translate','$filter','Notification','remoteApi','tools', function ($scope,$rootScope,$translate,$filter,Notification,remoteApi,tools) {

    $scope.barChart = echarts.init(document.getElementById('main'));
    $scope.lineChart = echarts.init(document.getElementById('line'));
    $scope.timepickerOptions ={format: 'YYYY-MM-DD', showClear: true};

    $translate('BROKER').then(function (broker) {
        $scope.BROKER_TITLE = broker;
        initBrokerBarChart();
        initBrokerLineChart();
    }, function (translationId) {
        $scope.BROKER_TITLE = translationId;
    });

    var initBrokerBarChart = function(){
        $scope.barChart.setOption({
            title: {
                text:$scope.BROKER_TITLE + ' TOP 10'
            },
            tooltip: {},
            legend: {
                data:['TPS']
            },
            grid: {
                x: 40,
                x2: 100,
                y2: 150
            },
            axisPointer : {
                type : 'shadow'
            },
            xAxis: {
                data: [],
                axisLabel: {
                    inside: false,
                    textStyle: {
                        color: '#000000'
                    },
                    rotate: 0,
                    interval:0
                },
                axisTick: {
                    show: true
                },
                axisLine: {
                    show: true
                },
                z: 10
            },
            yAxis: {
                type: 'value',
                boundaryGap: [0, '100%'],
                axisLabel: {
                    formatter: function(value){
                        return value.toFixed(2);
                    }
                },
                splitLine: {
                    show: true
                }
            },
            series: [{
                name: 'TPS',
                type: 'bar',
                data: []
            }]
        })
    }

    var initBrokerLineChart = function(){
        $scope.lineChart.setOption({
            title: {
                text: $scope.BROKER_TITLE + ' 5min line'
            },
            toolbox: {
                feature: {
                    dataZoom: {
                        yAxisIndex: 'none'
                    },
                    restore: {},
                    saveAsImage: {}
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    animation: false
                }
            },
            yAxis: {
                type: 'value',
                boundaryGap: [0, '100%'],
                axisLabel: {
                    formatter: function(value){
                        return value.toFixed(2);
                    }
                },
                splitLine: {
                    show: true
                }
            },
            dataZoom: [{
                type: 'inside',
                start: 90,
                end: 100
            }, {
                start: 0,
                end: 10,
                handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                handleSize: '80%',
                handleStyle: {
                    color: '#fff',
                    shadowBlur: 3,
                    shadowColor: 'rgba(0, 0, 0, 0.6)',
                    shadowOffsetX: 2,
                    shadowOffsetY: 2
                }
            }],
            legend: {
                data: []
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                data: []
            },
            series: []
        })

    }

    var getBrokerBarChartOp = function(xAxisData,data){
        // 指定图表的配置项和数据
        var option = {
            xAxis: {
                data: xAxisData,
                axisLabel: {
                    inside: false,
                    textStyle: {
                        color: '#000000'
                    },
                    rotate: 0,
                    interval:0
                },
                axisTick: {
                    show: true
                },
                axisLine: {
                    show: true
                },
                z: 10
            },
            series: [{
                name: 'TPS',
                type: 'bar',
                data: data
            }]
        };

        $scope.barChart.setOption(option);
    }

    var callback = function (resp) {
        if (resp.status == 0) {
            var clusterMap = resp.data.clusterInfo.clusterAddrTable;
            var brokerMap = resp.data.clusterInfo.brokerAddrTable;
            var brokerDetail = resp.data.brokerServer;
            var clusterMap = tools.generateBrokerMap(brokerDetail,clusterMap,brokerMap);
            $scope.brokerArray = [];
            $.each(clusterMap,function(clusterName,brokers){
                $.each(brokers,function(i,broker){
                    $scope.brokerArray.push(broker)
                })
            })

            //sort the brokerArray
            $scope.brokerArray.sort(function(firstBroker,lastBroker){
                var firstTps = parseFloat(firstBroker.getTotalTps.split(' ')[0]);
                var lastTps = parseFloat(lastBroker.getTotalTps.split(' ')[0]);
                return lastTps-firstTps;
            });

            var xAxisData = [],
                data = [];

            $.each($scope.brokerArray,function(i,broker){
                if(i > 9){
                    return false;
                }
                xAxisData.push(broker.brokerName + ":" + broker.index);
                data.push(broker.getTotalTps.split(' ')[0]);
            })
            getBrokerBarChartOp(xAxisData,data);
        }else{
            Notification.error({message: resp.errMsg, delay: 2000});
        }
    }


    remoteApi.queryClusterList(callback);


    var getBrokerLineChart = function(legend,data){
        var series = [];
        var xAxisData = [];
        var flag = true;
        var i = 0;
        $.each(data,function(key,value){
            if(i > 9 ){
                return false;
            }
            var _tps = [];
            $.each(value,function(i,tpsValue){
                var tpsArray = tpsValue.split(",");
                if(flag){
                    xAxisData.push($filter('date')(tpsArray[0], "HH:mm:ss"));
                }
                _tps.push(tpsArray[1]);
            })
            flag = false;
            var _series = {
                name:key,
                type:'line',
                smooth:true,
                symbol: 'none',
                sampling: 'average',
                data: _tps
            }
            series.push(_series);
            i++
        })

        var option = {
            legend: {
                data: legend
            },
            color: ["#FF0000", "#00BFFF", "#FF00FF", "#1ce322", "#000000", '#EE7942'],
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: xAxisData
            },
            series: series
        };
        return option;
    }

    //router after will clear this thread
    $rootScope._thread = setInterval(function () {
        var _date;
        if($scope.date != null){
            _date = $filter('date')($scope.date.valueOf(), "yyyy-MM-dd");
        }else{
            _date = $filter('date')(new Date(), "yyyy-MM-dd");
        }

        remoteApi.queryBrokerHisData(_date,function(resp){
            if (resp.status == 0) {
                var _data = {}
                var _xAxisData = [];
                $.each(resp.data,function(address,values){
                    _data[address] = values;
                    _xAxisData.push(address);
                })
                $scope.lineChart.setOption(getBrokerLineChart(_xAxisData,_data));
            }else{
                Notification.error({message: resp, delay: 2000});
            }
        })

    }, tools.dashboardRefreshTime);

}]);



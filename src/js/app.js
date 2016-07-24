var socket = io.connect($('meta[name="hostname"]').attr('content'));

socket.on('status', function (data) {
  var statuses = data.globalStatuses.concat(data.regionStatuses);
  $.each(statuses, function(i,v) {
    var $value = $('#' + v.region + ' .value');
    $value.text(v.text);
    $value.attr('class', v.statusCode + ' pull-right value');
  });
  $.each(data.stats, function (k,v) {
    var text = v;
    if (typeof v !== 'string')
    {
      text = v.text;
      $('#' + k + ' .value').attr('class', 'value ' + v.code);
    }

    $('#' + k + ' .value').text(text);
  });
});

socket.on('historicalServers', function (data) {
  generateMinutelyGraph(data, 'server');
});

socket.on('historicalLogin', function (data) {
  generateMinutelyGraph(data, 'login');
});

function generateMinutelyGraph(statuses, type)
{
  var labels = statuses.map(function (status) {
    return moment(status.day + '-' + status.hour + '-' + status.interval, 'DDD-HH-mm').format('DD MMM HH:mm');
  });

  var graphData = statuses.map(function (status) {
    return status.avg;
  });

  var data = {
    labels: labels,
    datasets: [
      {
        fill: false,
        lineTension: 0.1,
        backgroundColor: '#FF9C00',
        borderColor: '#FF9C00',
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        borderWidth: 2,
        data: graphData,
        spanGaps: false,
        pointBorderColor: '#FF9C00',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#FF9C00',
        pointHoverBorderColor: 'rgba(220,220,220,1)',
        pointHoverBorderWidth: 2,
        pointRadius: 1.7,
        pointHitRadius: 10,
      }
    ]
  };

  var options = {
    legend: {
      display: false
    },
    tooltips: {
      bodyFontSize: 0
    },
    scales: {
      yAxes: [{
        display: false
      }],
      xAxes: [{
        gridLines: {
          display: false
        }
      }]
    },
    animation: {
      duration: 0
    },
    maintainAspectRatio: false
  };

  $('#' + type + '-graph').parent().html('<canvas id="' + type + '-graph" height="360"></canvas>');
  var ctx = $('#' + type + '-graph');
  var minutelyGraph = new Chart(ctx, {
    type: 'line',
    data: data,
    options: options
  });
  
  $('.' + type + '-graph-loader').hide();

  // var ctxDay = $('#minutely-day-graph');
  // var minutelyDayGraph = new Chart(ctxDay, {
  //   type: 'line',
  //   data: dataDay,
  //   options: options
  // });
}

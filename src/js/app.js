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
    if (v.text)
    {
      text = v.text;
      $('#' + k + ' .value').attr('class', 'value ' + v.code);
    }

    $('#' + k + ' .value').text(text);
  });
});

socket.on('historicalLoginGlobal', function (data) {
  generateMinutelyGraph(data, 'google');
});

socket.on('historicalLoginPTC', function (data) {
  generateMinutelyGraph(data, 'ptc');
});

function generateMinutelyGraph(statuses, type)
{
  var labels = statuses.map(function (status) {
    return moment(status.day + '-' + status.hour + '-' + status.minute, 'DDD-HH-mm').format('DD MMM HH:mm');
  });

  var graphData = statuses.map(function (status) {
    return (Math.ceil(status.avg / 10) / 100).toFixed(2);

  });

  var data = {
    labels: labels,
    datasets: [
      {
        fill: false,
        backgroundColor: '#FF9C00',
        borderColor: '#FF9C00',
        borderWidth: 2,
        data: graphData,
        pointColor: '#FF9C00',
        pointHighlightStroke: '#FF9C00',
        pointRadius: 1.5,
        pointHitRadius: 15
      }
    ]
  };

  var options = {
    legend: {
      display: false
    },
    tooltips: {
      custom: function(tooltip) {
        // tooltip will be false if tooltip is not visible or should be hidden
        if (!tooltip) {
          return;
        }

        tooltip.text = '123';
      }
    },
    scales: {
      yAxes: [{
        gridLines: {
          display: false
        }
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
    hover: {
      mode: 'x-axis'
    },
    maintainAspectRatio: false
  };

  $('#' + type + '-graph').parent().html('<canvas id="' + type + '-graph" height="360"></canvas>');
  var ctx = document.getElementById(type + '-graph').getContext("2d");
  var minutelyGraph = new Chart(ctx, {
    type: 'line',
    data: data,
    options: options
  });

  $('.' + type + '-graph-loader').hide();
}

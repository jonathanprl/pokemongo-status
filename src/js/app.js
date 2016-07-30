var socket = io.connect($('meta[name="hostname"]').attr('content'));

socket.on('globalStatus', function (data) {
  $('#global-status').html('');
  $.each(data, function(i,v) {
    var $statusBox = $('<div>').attr('class', 'status').html('&nbsp;' + v.friendly);
    $statusBox.prepend($('<span>').attr('class', 'label label-' + v.class).text(v.code));
    $('#global-status').append($statusBox);
  });
});

socket.on('status', function (data) {
  var statuses = data.globalStatuses;
  $.each(statuses, function(i,v) {
    console.log(v);
    var $region = $('#' + v.region);
    $region.find('.value').attr('class', 'value ' + v.code).text(v.text);
    $region.find('.time').attr('class', 'time ' + v.code).text((Math.ceil(v.time / 10) / 100).toFixed(2) + 's');
    $region.find('.explanation').toggle(!!v.explanation).text(v.explanation);
  });
  $.each(data.stats, function (k,v) {
    var $general = $('#' + k);
    var text = v;
    if (v.code)
    {
      var $general = $('#' + k);
      text = v.friendly;
      $general.find('.value').attr('class', 'value ' + v.code);
      $general.find('.explanation').toggle(!!v.explanation).text(v.explanation);
    }

    $general.find('.value').text(text);
  });
});

socket.on('historicalLoginGlobal', function (data) {
  generateMinutelyGraph(data, 'google');
});

socket.on('historicalLoginPTC', function (data) {
  generateMinutelyGraph(data, 'ptc');
});

socket.on('historicalServer', function (data) {
  generateMinutelyGraph(data, 'server');
});

function generateMinutelyGraph(statuses, type)
{
  var labels = statuses.map(function (status) {
    return moment(status.day + '-' + status.hour + '-' + status.minute, 'DDD-HH-mm').toDate();
  });

  var graphData = statuses.map(function (status) {
    return (Math.ceil(status.avg / 10) / 100).toFixed(2);
  });

  var graph = document.getElementById(type + '-graph');

  if (graph.data)
  {
    graph.data[0].x = labels;
    graph.data[0].y = graphData;
    Plotly.redraw(graph);
    return;
  }

  $('#' + type + '-graph-loader').hide();

  Plotly.plot(graph, [{
    x: labels,
    y: graphData,
    type: 'scatter',
    line: {
      color: '#FF9C00'
    }
  }], {
    margin: {
      t: 0,
      b: 35,
      l: 40,
      r: 20
    },
    yaxis: {
      color: '#bababa',
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.05)'
    },
    xaxis: {
      color: '#bababa',
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.05)'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    hovermode: 'x'
  });
}

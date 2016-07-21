  var socket = io.connect('http://localhost:8282');

  socket.on('status', function (data) {
    var statuses = data.globalStatuses.concat(data.regionStatuses);
    $.each(statuses, function(i,v) {
      var $value = $('#' + v.region + ' .value');
      $value.text(v.text);
      $value.attr('class', v.statusCode + ' pull-right value');
    });
    $.each(data.stats, function(k,v) {
      $('#' + k + ' .value').text(v);
    });
  });

$(document).on('click', '.pattern', selectPattern)

$(".color").spectrum({
  flat: true,
  showInput: true,
  showAlpha: true,
  showButtons: false,
  move: function(color) {
    var rgba = color.toRgb();
    $('body').css('background-color', 'rgb(' + rgba.r + ', ' + rgba.g + ', '+ rgba.b + ')');
    $('.preview-area').css('opacity', rgba.a);
  }
});

function selectPattern(event) {
  var url = $(this).data('url');
  $('.preview-area').css('background-image', 'url(' + url + ')');
}

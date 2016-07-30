var articleTime = moment($('time').attr('datetime')).fromNow();
$('time').text(articleTime);

var content = markdown.toHTML($('.markdown').html());
$('.markdown').html(content);

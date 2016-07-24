const Twit = require('twit');
const moment = require('moment');

const config = require('../../config');
const db = require('../db');
const swiftping = require('../helpers/swiftping');

let twit = new Twit(config.twitter);

module.exports = {
  sendTweet
};

function sendTweet(code, hashtags)
{
  if (typeof hashtags === 'undefined')
  {
    hashtags = 3;
  }

  db.findWhere('tweets', { code: code }, {}, null, { lastTweeted: 1 }, (err, tweets) => {

    if (!tweets || tweets.length == 0)
    {
      return false;
    }

    var recentTweets = tweets.filter((tweet) => {
      return moment().diff(moment(tweet.lastTweeted), 'minutes') <= tweet.timeInbetween;
    });

    if (recentTweets.length > 0)
    {
      return swiftping.logger('info', 'twitter', `A tweet with code "${code}" has already been posted within the past ${recentTweets[0].timeInbetween} minutes.`, { tweets: tweets, code: code });
    }

    var tweet = tweets[0];

    tweet.hashtags = tweet.hashtags.slice(0, hashtags);

    swiftping.logger('info', 'twitter', `Tweeting "${tweet.text.substring(0, 80)}..."`, { tweet: `${tweet.text} ${tweet.hashtags.join(' ')} http://pokegostat.us` });

    twit.post('statuses/update', { status: `${tweet.text} ${tweet.hashtags.join(' ')} http://pokegostat.us` }, function(err, data, response) {
      if (err) {
        if (hashtags >= 0 && err.code == 186)
        {
          swiftping.logger('warning', 'twitter', `Status over 140 characters. Trying with ${hashtags} hashtags.`, { tweet: `${tweet.text} ${tweet.hashtags.join(' ')} http://pokegostat.us`, hashtags: hashtags });
          return sendTweet(code, hashtags - 1);
        }
        return swiftping.logger('error', 'twitter', 'There was an error Tweeting. Code: ' + err.code, { twitError: err, hashtags: hashtags });
      }
      _updateTweetDb(tweet._id);
      swiftping.logger('info', 'twitter', 'Tweet posted successfully', { data: data, response: response });
    });
  });
}

function _updateTweetDb(id)
{
  db.update('tweets', { _id: id }, { $set: { lastTweeted: new Date() } }, (err, doc) => {
    if (err) {
      swiftping.logger('error', 'db', 'Could not update tweets collection', { mongoErr: err, doc: doc });
    }
  });
}

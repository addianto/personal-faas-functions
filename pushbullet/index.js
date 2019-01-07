'use strict';

exports.pushPostmark = (event, context, callback) => {
  const https = require('https');
  const destEmail = process.env.PUSHBULLET_EMAIL;
  let options;
  let data;

  if (destEmail === undefined || destEmail === '') {
    console.error('PUSHBULLET_EMAIL is not set in environment variable');
    callback(-1);
  }

  try {
    const subject = event.value.fields.subject.stringValue;
    const body = event.value.fields.textBody.stringValue;
    options = createRequestOptions('/v2/pushes', 'POST');
    data = createPushNoteData(destEmail, subject, body);
  } catch (e) {
    console.error(e);
    callback(e);
  }

  const pushbulletRequest = https.request(options, (pushbulletResponse) => {
    console.log('API response:', pushbulletResponse.statusCode, pushbulletResponse.statusMessage);
    pushbulletResponse.setEncoding('utf8');
    let rawResponseData = '';

    pushbulletResponse.on('data', (chunk) => rawResponseData += chunk);
    pushbulletResponse.on('end', () => {
      try {
        const pushbulletResponseData = JSON.parse(rawResponseData);
        console.log('Data from API:', pushbulletResponseData);
      } catch (e) {
        console.error(e);
        callback(e);
      }
    });
  });

  pushbulletRequest.end(JSON.stringify(data), () => {
    const message = 'Successfully sent a push message';
    console.info(message);
    callback();
  });
};

exports.sendPush = (request, response) => {
  const https = require('https');
  const destEmail = process.env.PUSHBULLET_EMAIL;
  let options;
  let data;

  if (destEmail === undefined || destEmail === '') {
    console.error('PUSHBULLET_EMAIL is not set in environment variable');
    response.status(500).end();
  }

  try {
    options = createRequestOptions('/v2/pushes', 'POST');
    data = createPushNoteData(destEmail, 'Test Message',
      'This is a test message');
  } catch (e) {
    console.error(e.message);
    response.status(500).end();
  }

  const pushbulletRequest = https.request(options, (pushbulletResponse) => {
    console.log('API response:', pushbulletResponse.statusCode, pushbulletResponse.statusMessage);
    pushbulletResponse.setEncoding('utf8');
    let rawResponseData = '';

    pushbulletResponse.on('data', (chunk) => rawResponseData += chunk);
    pushbulletResponse.on('end', () => {
      try {
        const pushbulletResponseData = JSON.parse(rawResponseData);
        console.log('Data from API:', pushbulletResponseData);
      } catch (e) {
        console.error('Failed to parse data from API:', e);
      }
    });
  });

  pushbulletRequest.end(JSON.stringify(data), () => {
    const message = 'Successfully sent a push message';
    console.info(message);
    response.status(200).end(message);
  });
};

const createRequestOptions = (path, method) => {
  const accessToken = process.env.PUSHBULLET_API_TOKEN;

  if (accessToken === undefined || accessToken === '') {
    throw new Error('PUSHBULLET_API_TOKEN is not set in environment variables');
  }

  return {
    hostname: 'api.pushbullet.com',
    path: path,
    method: method.toUpperCase(),
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  };
};

const createPushData = (email, title, body) => {
  return {
    email: email,
    title: title,
    body: body
  };
};

const createPushNoteData = (email, title, body) => {
  const data = createPushData(email, title, body);
  data.type = 'note';
  return data;
};

const createPushLinkData = (email, title, body, url) => {
  const data = createPushData(email, title, body);
  data.type = 'link';
  data.url = url;
  return data;
};

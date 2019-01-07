'use strict';

exports.postmark = (request, response) => {
  if (!isValidRequest(request)) {
    console.error('Invalid type of request');
    response.status(405).end('Only supports secure POST request');
  }

  const bodyParser = require('body-parser');
  request.app.use(bodyParser.json());
  const dataBuffer = Buffer.from(JSON.stringify(request.body));

  const {PubSub} = require('@google-cloud/pubsub');
  const pubSubClient = new PubSub();
  pubSubClient.topic('postmark')
    .publisher()
    .publish(dataBuffer, (err, messageId) => {
      if (err) {
        console.error(`Error when publishing message to Google Pub/Sub`);
        response.status(500).end();
      }

      console.info(`Published message ID '${messageId}`);
      response.status(200).end();
    });
};

exports.storePostmark = (data, context, callback) => {
  const Firestore = require('@google-cloud/firestore');
  const firestoreClient = new Firestore();
  firestoreClient.settings({timestampsInSnapshots: true});

  const dataString = Buffer.from(data.data, 'base64').toString();
  const dataJson = JSON.parse(dataString);
  const messageDate = new Date(dataJson.Date);
  console.log(`JSON data as string: ${dataString}`);

  const postmarkCollection = firestoreClient.collection('postmark');
  postmarkCollection.add({
    messageId: dataJson.MessageID,
    date: Firestore.Timestamp.fromDate(messageDate),
    subject: dataJson.Subject,
    textBody: dataJson.TextBody,
    htmlBody: dataJson.HtmlBody
  }).then((document) => {
    console.info(`Added new document with name '${document.id}`);
    callback();
  }).catch((error) => {
    console.error(error);
    callback(error);
  });
};

const isValidRequest = (request) => {
  return request.secure && request.method === 'POST' &&
    request.get('content-type') === 'application/json';
};
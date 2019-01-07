'use strict';
const {postmark} = require('./index');
const {PubSub} = require('@google-cloud/pubsub');
jest.mock('@google-cloud/pubsub');

describe('The handler for incoming messages from Postmark', () => {

  const sampleMessageId = 123;
  let mockRequest = {};
  let mockResponse = {};
  let mockTopic = null;
  let mockPublish = null;

  beforeEach(() => {
    // Setting up mock request object
    mockRequest.app = {
      use: jest.fn((obj) => {})
    };
    mockRequest.secure = true;
    mockRequest.method = 'POST';
    mockRequest.get = jest.fn((param) => {
      if (param.toLowerCase() === 'content-type') {
        return 'application/json';
      }

      return 'text/html';
    });
    mockRequest.body = {foo: 'bar'};

    // Setting up mock response object
    mockResponse.status = jest.fn().mockReturnThis();
    mockResponse.end = jest.fn();

    // Setting up mock PubSub client
    PubSub.mockClear();
    //mockPublish = jest.fn().mockReturnValue(sampleMessageId);
    mockPublish = jest.fn((data, callback) => {
      callback(null, sampleMessageId);
    });
    mockTopic = jest.fn((name) => {
      this.name = name;
      return {
        publisher: jest.fn().mockReturnValue({
          publish: mockPublish
        })
      };
    });
    PubSub.prototype.topic = mockTopic;
  });

  it('only accepts secure (HTTPS) request', () => {
    mockRequest.secure = false;
    postmark(mockRequest, mockResponse);

    expectResponseReturnStatusCode(mockResponse, 405);
  });

  it('only accepts POST request', () => {
    mockRequest.method = 'GET';
    postmark(mockRequest, mockResponse);

    expectResponseReturnStatusCode(mockResponse, 405);
  });

  it('only accepts request with JSON payload', () => {
    mockRequest.get = jest.fn().mockReturnValue('text/html');
    postmark(mockRequest, mockResponse);

    expectResponseReturnStatusCode(mockResponse, 405);
  });

  it('only accepts request containing valid JSON data from Postmark', () => {
    // TODO Validate using JSON Schema?
    mockRequest.body = {
      Subject: 'This is a test',
      Date: '12345',
      TextBody: 'Lorem ipsum dolor sit amet'
    };
    postmark(mockRequest, mockResponse);

    expectResponseReturnStatusCode(mockResponse, 200);
  });

  it('uses Google PubSub library successfully', () => {
    postmark(mockRequest, mockResponse);

    expect(mockTopic).toHaveBeenCalledWith('postmark');
    expect(mockPublish).toBeCalled();
    expectResponseReturnStatusCode(mockResponse, 200);
  });
});

const expectResponseReturnStatusCode = (mockResponse, code) => {
  expect(mockResponse.status.mock.calls[0][0]).toBe(code);
  expect(mockResponse.end).toBeCalled();
};
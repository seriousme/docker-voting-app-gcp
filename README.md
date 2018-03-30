# Docker Voting App done Serverless Style using Google Firebase

## Introduction

I was reading [Deploy the Voting App to AWS ECS with Fargate] by Tony Pujals
where he describes how to run the [Docker Voting app demo] on AWS using [AWS
Fargate]

[deploy the voting app to aws ecs with fargate]: https://medium.com/@tonypujals/deploy-the-voting-app-to-aws-ecs-with-fargate-
[docker voting app demo]: https://github.com/subfuzion/docker-voting-app-nodejs
[aws fargate]: https://aws.amazon.com/fargate/

Of course I understand that the Docker Voting app is a showcase of Docker
technology and that it's not the most exciting application from a business
perspective. I also understand that people want to show how you can take Docker
technology to AWS. However in my mind I started wondering: if I would take this
to AWS would I be following the same path ? Or would I go Serverless ?

Given the title: I went Serverless!

The first iteration was on [AWS using AWS ApiGateway and AWS DynamoDB only]. And
then I figured that it would be fun to try it on Google Cloud as well. Given the
simplicity of the problem I went for [Google Firebase].

[aws using aws apigateway and aws dynamodb only]: https://github.com/seriousme/docker-voting-app-aws
[google firebase]: https://firebase.google.com/

## Figuring out the API

Looking at the sources of the original voting app there are two endpoints:

* POST /vote where you can post a vote by posting JSON like `{"vote":"a"}` or
  `{"vote":"b"}`
* GET /results which will give you results like:

```json
{
  "success": true,
  "result": {
    "a": 0,
    "b": 0
  }
}
```

Firebase does nothing with automatic schema validation like the AWS API
ApiGateway does. So creating a JSON schema is of no use here. Given the specific
formats of the API a simple route to a solution is to use [Firebase Functions]
with data stored using [Firebase Realtime Database].

[firebase functions]: https://firebase.google.com/products/functions/
[firebase realtime database]: https://firebase.google.com/products/realtime-database/

And then it becomes a rather simple exercise:

## Import dependencies and initialize the connection to the database

```js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
```

## Define the route for /vote

```js
exports.vote = functions.https.onRequest((request, response) => {
  const vote = request.body.vote;
  if (vote === "a" || vote === "b") {
    const resultsRef = admin.database().ref("/result");
    const ref = resultsRef.child(vote);
    ref.transaction(currentVotes => {
      // If result.{vote} has never been set, currentVotes will be `null`.
      return (currentVotes || 0) + 1;
    });
    response.send("You voted: " + vote);
  } else {
    response.status(400).send("Invalid request");
  }
});
```

## Define the route for /results

```js
exports.results = functions.https.onRequest((request, response) => {
  var results = {
    success: true,
    result: {
      a: 0,
      b: 0
    }
  };
  return admin
    .database()
    .ref("/result")
    .once("value")
    .then(snapshot => {
      const resultsData = snapshot.val();
      results.result.a = resultsData.a || 0;
      results.result.b = resultsData.b || 0;
      response.json(results);
      return;
    })
    .catch(_ => {
      response.json(results);
    });
});
```

The data might not exist in the database yet when `/results` is being called
therefore this function takes care of that using `resultsData.a || 0` and
through the `.catch` handler.

The complete code can be found in [functions/index.js]. All the rest of the
project is auto generated using [firebase-tools].

[functions/index.js]: https://github.com/seriousme/docker-voting-app-gcp/blob/master/functions/index.js
[firebase-tools]: https://www.npmjs.com/package/firebase-tools

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

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

/* eslint-env node */
/* eslint-disable no-undef */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fireFunctions = require("firebase-functions/v1");

admin.initializeApp();

// Checks for unfinished task lists older than 16 hours and notifies the user.
// If a userId is provided, only that user's lists are checked.
async function checkExpiredLists(userId) {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - 16 * 60 * 60 * 1000
  );

  let users = [];
  if (userId) {
    const doc = await db.collection("users").doc(userId).get();
    if (doc.exists) users = [doc];
  } else {
    const usersSnap = await db.collection("users").get();
    users = usersSnap.docs;
  }

  for (const userDoc of users) {
    const token = userDoc.get("fcmToken");
    if (!token) continue;

    const memories = await userDoc.ref
      .collection("memories")
      .where("finished", "==", false)
      .where("timestamp", "<=", cutoff)
      .get();

    for (const mem of memories.docs) {
      const data = mem.data();
      const total = (data.tasks || []).length;
      const completed = (data.completed || []).length;
      const score = total ? Math.round((completed / total) * 100) : 0;

      await admin.messaging().send({
        token,
        notification: {
          title: "16 hour session ended",
          body: `Signal score: ${score}%. Start a new task list!`,
        },
      });

      await mem.ref.update({
        finished: true,
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        percentage: score,
      });

      functions.logger.log("Notification sent", { user: userDoc.id, score });
    }
  }
}

exports.notifyExpiredLists = fireFunctions.pubsub
  .schedule("every 5 minutes")
  .onRun(checkExpiredLists);

// Schedule a one-time check based on the list creation time
exports.scheduleExpiredListCheck = functions.https.onRequest((req, res) => {
  const created = Number(req.query.created);
  const userId = req.query.userId;
  if (!created || !userId) {
    res.status(400).send("Missing 'created' timestamp or 'userId'");
    return;
  }

  const delay = created + 16 * 60 * 60 * 1000 - Date.now();
  const runCheck = () =>
    checkExpiredLists(userId).catch((err) =>
      functions.logger.error("Scheduled check error", err)
    );

  if (delay <= 0) {
    runCheck();
    res.send("List already expired. Ran check immediately.");
  } else {
    setTimeout(runCheck, delay);
    res.send(
      `Scheduled expired list check for user ${userId} in ${delay} ms.`
    );
  }
});

exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      res.status(400).send("Missing 'token' parameter");
      return;
    }

    const messagePayload = {
      notification: {
        title: "Test notification",
        body: "This is a test push from Life Assistant.",
      },
      token,
    };

    const response = await admin.messaging().send(messagePayload);
    functions.logger.info("Test notification sent", response);
    res.send("Test notification sent.");
  } catch (err) {
    functions.logger.error("Error sending test notification", err);
    res.status(500).send("Error sending test notification.");
  }
});

/* eslint-env node */
/* eslint-disable no-undef */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fireFunctions = require("firebase-functions/v1");

admin.initializeApp();

// Checks for unfinished task lists older than 16 hours and notifies the user.
async function checkExpiredLists() {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - 16 * 60 * 60 * 1000
  );

  const usersSnap = await db.collection("users").get();
  for (const userDoc of usersSnap.docs) {
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
  if (!created) {
    res.status(400).send("Missing 'created' timestamp");
    return;
  }

  const delay = created + 16 * 60 * 60 * 1000 - Date.now();
  const runCheck = () =>
    checkExpiredLists().catch((err) =>
      functions.logger.error("Scheduled check error", err)
    );

  if (delay <= 0) {
    runCheck();
    res.send("List already expired. Ran check immediately.");
  } else {
    setTimeout(runCheck, delay);
    res.send(`Scheduled expired list check in ${delay} ms.`);
  }
});

exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
  try {
    // Allow an optional token query param to target a single device.
    const tokenParam = req.query.token;
    let tokens = [];

    if (tokenParam) {
      tokens = [tokenParam];
    } else {
      const tokensSnapshot = await admin
        .firestore()
        .collection("users")
        .where("fcmToken", "!=", null)
        .get();
      tokens = tokensSnapshot.docs.map((doc) => doc.data().fcmToken);
    }

    if (tokens.length === 0) {
      res.status(200).send("No tokens available for notification.");
      return;
    }

    const messagePayload = {
      notification: {
        title: "Test notification",
        body: "This is a test push from Life Assistant.",
      },
      tokens,
    };

    const response = await admin
      .messaging()
      .sendEachForMulticast(messagePayload);
    functions.logger.info("Test notifications sent", response);
    res.send("Test notification sent.");
  } catch (err) {
    functions.logger.error("Error sending test notification", err);
    res.status(500).send("Error sending test notification.");
  }
});

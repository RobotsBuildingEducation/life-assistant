/* eslint-env node */
/* eslint-disable no-undef */
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fireFunctions = require("firebase-functions");

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

      logger.log("Notification sent", { user: userDoc.id, score });
    }
  }
}

exports.notifyExpiredLists = onSchedule("every 5 minutes", checkExpiredLists);

// Schedule a one-time check based on the list creation time
exports.scheduleExpiredListCheck = onRequest((req, res) => {
  const created = Number(req.query.created);
  if (!created) {
    res.status(400).send("Missing 'created' timestamp");
    return;
  }

  const delay = created + 16 * 60 * 60 * 1000 - Date.now();
  const runCheck = () =>
    checkExpiredLists().catch((err) =>
      logger.error("Scheduled check error", err)
    );

  if (delay <= 0) {
    runCheck();
    res.send("List already expired. Ran check immediately.");
  } else {
    setTimeout(runCheck, delay);
    res.send(`Scheduled expired list check in ${delay} ms.`);
  }
});

const encouragingMessages = [
  { title: "Keep going!", body: "You're doing great today." },
  { title: "Stay focused", body: "Remember your goals and keep moving." },
  { title: "You got this", body: "Small steps lead to big results." },
];

exports.sendDailyEncouragingMessage = fireFunctions.pubsub
  .schedule("13 10 * * *")
  .timeZone("America/Los_Angeles")
  .onRun(async () => {
    try {
      const tokensSnapshot = await admin
        .firestore()
        .collection("users")
        .where("fcmToken", "!=", null)
        .get();

      const tokens = tokensSnapshot.docs.map((doc) => doc.data().fcmToken);

      if (tokens.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * encouragingMessages.length
        );
        const selectedMessage = encouragingMessages[randomIndex];

        const messagePayload = {
          notification: {
            title: selectedMessage.title,
            body: selectedMessage.body,
          },
          tokens,
        };

        const response = await admin
          .messaging()
          .sendEachForMulticast(messagePayload);
        console.log("Successfully sent messages:", response);
      } else {
        console.log("No tokens available for sending notifications.");
      }
    } catch (error) {
      console.error("Error sending daily notification:", error);
    }
  });

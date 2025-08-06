const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");

admin.initializeApp();

// Checks for unfinished task lists older than 16 hours and notifies the user.
exports.notifyExpiredLists = onSchedule("every 5 minutes", async () => {
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
});

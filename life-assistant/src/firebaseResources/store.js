// Import Firestore functions
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { database } from "./config";

export const createUser = async (npub, userName) => {
  const userDocRef = doc(database, "users", npub);
  await setDoc(
    userDocRef,
    {
      name: userName,
      npub: npub,
      step: "onboarding",
      onboardingStep: 1,
    },
    { merge: true }
  );
};

export const getUser = async (npub) => {
  const userDocRef = doc(database, "users", npub);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return userDoc.data();
  } else {
    return null;
  }
};

export const updateUser = async (npub, payload, teamSharedData = undefined) => {
  const userDocRef = doc(database, "users", npub);

  await updateDoc(userDocRef, {
    ...payload,
  });

  try {
    const teamMembershipsRef = collection(database, "users", npub, "teams");
    const membershipsSnapshot = await getDocs(teamMembershipsRef);

    if (!membershipsSnapshot.empty) {
      const batch = writeBatch(database);

      const teamPayloadSource =
        teamSharedData !== undefined ? teamSharedData : payload;
      const teamEntries = Object.entries(teamPayloadSource || {}).filter(
        ([, value]) => value !== undefined
      );

      if (teamEntries.length > 0) {
        const teamPayload = teamEntries.reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

        membershipsSnapshot.forEach((membership) => {
          const membershipData = membership.data();
          if (membershipData.status === "active" && membershipData.teamId) {
            const teamRef = doc(database, "teams", membershipData.teamId);
            batch.set(
              teamRef,
              {
                memberData: {
                  [npub]: {
                    ...teamPayload,
                  },
                },
              },
              { merge: true }
            );
          }
        });

        await batch.commit();
      }
    }
  } catch (error) {
    console.error("Failed to sync team member data:", error);
  }
};

export const listenToUserTeams = (npub, callback) => {
  const teamsRef = collection(database, "users", npub, "teams");
  return onSnapshot(teamsRef, callback);
};

export const createTeam = async (ownerNpub, name, invitees = []) => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Team name is required");
  }

  const uniqueInvitees = Array.from(
    new Set(
      invitees
        .map((invite) => invite.trim())
        .filter((invite) => invite && invite !== ownerNpub)
    )
  );

  const batch = writeBatch(database);
  const teamRef = doc(collection(database, "teams"));

  batch.set(teamRef, {
    name: trimmedName,
    owner: ownerNpub,
    members: [ownerNpub],
    invites: uniqueInvitees,
    createdAt: serverTimestamp(),
  });

  const ownerTeamRef = doc(database, "users", ownerNpub, "teams", teamRef.id);
  batch.set(ownerTeamRef, {
    teamId: teamRef.id,
    name: trimmedName,
    role: "owner",
    status: "active",
    owner: ownerNpub,
    createdAt: serverTimestamp(),
  });

  uniqueInvitees.forEach((invitee) => {
    const inviteRef = doc(database, "users", invitee, "teams", teamRef.id);
    batch.set(inviteRef, {
      teamId: teamRef.id,
      name: trimmedName,
      role: "member",
      status: "invited",
      owner: ownerNpub,
      invitedBy: ownerNpub,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return teamRef.id;
};

export const getTeamDetails = async (teamId) => {
  const teamRef = doc(database, "teams", teamId);
  const snapshot = await getDoc(teamRef);
  if (!snapshot.exists()) {
    return null;
  }
  return { id: teamId, ...snapshot.data() };
};

export const acceptTeamInvite = async (npub, teamId) => {
  const teamRef = doc(database, "teams", teamId);
  const userTeamRef = doc(database, "users", npub, "teams", teamId);

  const batch = writeBatch(database);
  batch.update(teamRef, {
    invites: arrayRemove(npub),
    members: arrayUnion(npub),
  });
  batch.update(userTeamRef, {
    status: "active",
    acceptedAt: serverTimestamp(),
  });
  batch.set(
    teamRef,
    {
      memberData: {
        [npub]: {},
      },
    },
    { merge: true }
  );

  await batch.commit();
};

export const declineTeamInvite = async (npub, teamId) => {
  const teamRef = doc(database, "teams", teamId);
  const userTeamRef = doc(database, "users", npub, "teams", teamId);

  const batch = writeBatch(database);
  batch.update(teamRef, {
    invites: arrayRemove(npub),
  });
  batch.delete(userTeamRef);

  await batch.commit();
};

export const leaveTeam = async (npub, teamId) => {
  const userTeamRef = doc(database, "users", npub, "teams", teamId);
  const membershipSnapshot = await getDoc(userTeamRef);

  if (!membershipSnapshot.exists()) {
    return;
  }

  const membershipData = membershipSnapshot.data();
  if (membershipData.role === "owner") {
    throw new Error("Team owners must transfer ownership before leaving.");
  }

  const teamRef = doc(database, "teams", teamId);
  const batch = writeBatch(database);
  batch.update(teamRef, {
    members: arrayRemove(npub),
    [`memberData.${npub}`]: deleteField(),
  });
  batch.delete(userTeamRef);

  await batch.commit();
};

export const deleteTeam = async (ownerNpub, teamId) => {
  const teamRef = doc(database, "teams", teamId);
  const teamSnapshot = await getDoc(teamRef);

  if (!teamSnapshot.exists()) {
    throw new Error("Team not found.");
  }

  const teamData = teamSnapshot.data();

  if (teamData.owner !== ownerNpub) {
    throw new Error("Only the team owner can delete this team.");
  }

  const batch = writeBatch(database);

  const members = Array.isArray(teamData.members) ? teamData.members : [];
  const invites = Array.isArray(teamData.invites) ? teamData.invites : [];

  [...new Set([...members, ...invites])].forEach((npub) => {
    const membershipRef = doc(database, "users", npub, "teams", teamId);
    batch.delete(membershipRef);
  });

  batch.delete(teamRef);

  await batch.commit();
};

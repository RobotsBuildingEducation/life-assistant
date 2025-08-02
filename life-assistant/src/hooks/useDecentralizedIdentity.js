import { useState, useEffect } from "react";

import { Buffer } from "buffer";
import { bech32 } from "bech32";

import NDK, {
  NDKPrivateKeySigner,
  NDKKind,
  NDKEvent,
} from "@nostr-dev-kit/ndk";

const ndk = new NDK({
  explicitRelayUrls: ["wss://relay.damus.io", "wss://relay.primal.net"],
});

export const useDecentralizedIdentity = (initialNpub, initialNsec) => {
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [nostrPubKey, setNostrPubKey] = useState(initialNpub || "");
  const [nostrPrivKey, setNostrPrivKey] = useState(initialNsec || "");

  useEffect(() => {
    // Load keys from local storage if they exist
    const storedNpub = localStorage.getItem("local_npub");
    const storedNsec = localStorage.getItem("local_nsec");

    if (storedNpub) {
      setNostrPubKey(storedNpub);
    }

    if (storedNsec) {
      setNostrPrivKey(storedNsec);
    }

    ndk
      .connect()
      .then(() => {
        setIsConnected(true);
      })
      .catch((err) => {
        console.error("Error connecting to Nostr:", err);
        setErrorMessage(err.message);
      });
  }, []);

  const generateNostrKeys = async (userDisplayName = null) => {
    const privateKeySigner = NDKPrivateKeySigner.generate();

    const privateKey = privateKeySigner.privateKey;
    const user = await privateKeySigner.user();

    const publicKey = user.npub;

    const encodedNsec = bech32.encode(
      "nsec",
      bech32.toWords(Buffer.from(privateKey, "hex"))
    );
      setNostrPrivKey(encodedNsec);
      setNostrPubKey(publicKey);

    if (!localStorage.getItem("local_nsec")) {
      //Creating profile... 2/4
      // setLoadingMessage("createAccount.isCreatingProfile");

      postNostrContent(
        JSON.stringify({
          name: userDisplayName,
          about: "A student onboarded with Robots Building Education",
          // profilePictureUrl:
          //   "https://image.nostr.build/c8d21fe8773d7c5ddf3d6ef73ffe76dbeeec881c131bfb59927ce0b8b71a5607.png",
          // // "https://primal.b-cdn.net/media-cache?s=o&a=1&u=https%3A%2F%2Fm.primal.net%2FKBLq.png",
        }),
        0,
        publicKey,
        encodedNsec
      );

      // setLoadingMessage("createAccount.isCreatingProfilePicture");
      // //Creating profile picture... 3/4
      // setProfilePicture(
      //   "https://primal.b-cdn.net/media-cache?s=o&a=1&u=https%3A%2F%2Fm.primal.net%2FKBLq.png",
      //   publicKey,
      //   encodedNsec
      // );

      // if (
      //   window.location.hostname !== "localhost" &&
      //   window.location.hostname !== "127.0.0.1"
      // ) {

      // setLoadingMessage("createAccount.isCreatingIntroPost");
      //Creating introduction post... 4/4
      // if (window.location.hostname !== "localhost") {
      postNostrContent(
        "gm nostr! I've joined #LearnWithNostr from Tiktok by creating an account with https://robotsbuildingeducation.com so I can learn how to code with AI.",
        1,
        publicKey,
        encodedNsec
      );
      // }
      // await followUserOnNostr(
      //   "npub14vskcp90k6gwp6sxjs2jwwqpcmahg6wz3h5vzq0yn6crrsq0utts52axlt",
      //   publicKey,
      //   encodedNsec
      // );
    }

    localStorage.setItem("local_nsec", encodedNsec);
    localStorage.setItem("local_npub", publicKey);
    localStorage.setItem("uniqueId", publicKey);

    return { npub: publicKey, nsec: encodedNsec };
  };

  const connectToNostr = async (npubRef = null, nsecRef = null) => {
    const defaultNsec = import.meta.env.VITE_GLOBAL_NOSTR_NSEC;
    const defaultNpub =
      "npub1mgt5c7qh6dm9rg57mrp89rqtzn64958nj5w9g2d2h9dng27hmp0sww7u2v";

    const nsec =
      nsecRef ||
      localStorage.getItem("local_nsec") ||
      nostrPrivKey ||
      defaultNsec;
    const npub =
      npubRef ||
      localStorage.getItem("local_npub") ||
      nostrPubKey ||
      defaultNpub;

    try {
      // Decode the nsec from Bech32
      const { words: nsecWords } = bech32.decode(nsec);
      const hexNsec = Buffer.from(bech32.fromWords(nsecWords)).toString("hex");

      // Decode the npub from Bech32
      const { words: npubWords } = bech32.decode(npub);
      const hexNpub = Buffer.from(bech32.fromWords(npubWords)).toString("hex");

      // Create a new NDK instance
      const ndkInstance = new NDK({
        explicitRelayUrls: ["wss://relay.damus.io", "wss://relay.primal.net"],
      });

      await ndkInstance.connect();

      setIsConnected(true);

      // Return the connected NDK instance and signer
      return { ndkInstance, hexNpub, signer: new NDKPrivateKeySigner(hexNsec) };
    } catch (err) {
      console.error("Error connecting to Nostr:", err);
      setErrorMessage(err.message);
      return null;
    }
  };

  const auth = async (nsec) => {
    try {
      // Decode nsec to hex
      const { words: nsecWords } = bech32.decode(nsec);
      const hexNsec = Buffer.from(bech32.fromWords(nsecWords)).toString("hex");

      const signer = new NDKPrivateKeySigner(hexNsec);
      await signer.blockUntilReady(); // Wait for signer user resolution
      ndk.signer = signer;

      const user = await signer.user();
      setNostrPubKey(user.npub);
      setNostrPrivKey(nsec);
      localStorage.setItem("local_npub", user.npub);
      localStorage.setItem("local_nsec", nsec);
      setErrorMessage(null);

      return { user, signer };
    } catch (error) {
      console.error("Error logging in with keys:", error);
      setErrorMessage(error.message);
      return null;
    }
  };

  const postNostrContent = async (
    content,
    kind = NDKKind.Text,
    nsecRef = null
  ) => {
    try {
      // If a nsecRef is provided, login with it
      if (nsecRef) {
        const loginResult = await auth(nsecRef);
        if (!loginResult) return;
      }

      // Ensure we have a signer after login
      if (!ndk.signer) {
        setErrorMessage("No signer available. Please login first.");
        return;
      }

      // If npubRef is provided, we can decode it to hex if needed.
      // But it's generally not required since NDKEvent uses ndk.signer to determine the pubkey.
      const event = new NDKEvent(ndk, {
        kind,
        tags: [],
        content: content,
        created_at: Math.floor(Date.now() / 1000),
      });

      await event.sign(ndk.signer);
      const relays = await event.publish();

      if (relays.size > 0) {
        console.log("Posted successfully to relays:", Array.from(relays));
      } else {
        console.warn("No relay acknowledged the event.");
      }
    } catch (error) {
      console.error("Error posting content:", error);
      setErrorMessage(error.message);
    }
  };

  const getHexNPub = (npub) => {
    // Decode the npub from Bech32
    const { words: npubWords } = bech32.decode(npub);
    const hexNpub = Buffer.from(bech32.fromWords(npubWords)).toString("hex");

    return hexNpub;
  };

  const assignExistingBadgeToNpub = async (
    badgeNaddr, //name or address
    awardeeNpub = localStorage.getItem("local_npub"), // The public key of the user being awarded
    ownerNsec = import.meta.env.VITE_SECRET_KEY // Your private key to sign the event
  ) => {
    if (!awardeeNpub) {
      console.error("Awardee public key is required to award the badge.");
      return;
    }

    if (!ownerNsec) {
      console.error(
        "Owner's private key is required to sign the badge award event."
      );
      return;
    }

    const { words: nsecWords } = bech32.decode(ownerNsec);
    const hexNsec = Buffer.from(bech32.fromWords(nsecWords)).toString("hex");

    let signer = new NDKPrivateKeySigner(hexNsec);

    // Connect to Nostr as the badge owner
    // const connection = await connectToNostr(
    //   "npub14vskcp90k6gwp6sxjs2jwwqpcmahg6wz3h5vzq0yn6crrsq0utts52axlt",
    //   ownerNsec
    // );

    // Create the event for awarding the badge
    const badgeAwardEvent = new NDKEvent(ndk, {
      kind: NDKKind.BadgeAward, // Badge Award event kind
      tags: [
        // ["a", badgeNaddr], // Reference to the Badge Definition event
        [
          "a",
          `${NDKKind.BadgeDefinition}:${getHexNPub(
            "npub14vskcp90k6gwp6sxjs2jwwqpcmahg6wz3h5vzq0yn6crrsq0utts52axlt"
          )}:${badgeNaddr}`,
        ],
        ["p", getHexNPub(localStorage.getItem("local_npub"))],
      ],
      created_at: Math.floor(Date.now() / 1000),
      //npub14vskcp90k6gwp6sxjs2jwwqpcmahg6wz3h5vzq0yn6crrsq0utts52axlt
      // pubkey: getHexNPub(
      //   "npub14vskcp90k6gwp6sxjs2jwwqpcmahg6wz3h5vzq0yn6crrsq0utts52axlt"
      // ),
      // Your public key as the issuer
    });

    // Sign the badge event
    try {
      await badgeAwardEvent.sign(signer);
    } catch (error) {
      console.error("Error signing badge event:", error);
    }

    // Publish the badge event
    try {
      await badgeAwardEvent.publish();
    } catch (error) {
      console.error("Error publishing badge event:", error);
    }
  };

  const getBadgeData = async (addy) => {
    try {
      // Connect to Nostr
      const connection = await connectToNostr();
      if (!connection) return [];

      const { ndkInstance } = connection;

      // const addressPointer = await getAddressPointer(addy);
      let addressPointer = addy.split(":");

      // Create a filter for badge events (kind 30008) for the given user
      const filter = {
        kinds: [NDKKind.BadgeDefinition], // Use the NDKKind enum for better readability
        authors: [addressPointer[1]], // The user's hex-encoded npub
        "#d": [addressPointer[2]],
        limit: 1,
      };

      // Create a subscription to fetch the events
      const subscription = ndkInstance.subscribe(filter, { closeOnEose: true });

      // Array to hold badges
      const badges = [];

      // Listen for events
      subscription.on("event", (event) => {
        const badgeInfo = {
          content: event.content,
          createdAt: event.created_at,
          tags: event.tags,
          badgeAddress: addy,
        };
        badges.push(badgeInfo);
      });

      // Wait for the subscription to finish
      await new Promise((resolve) => subscription.on("eose", resolve));

      // Log the retrieved badges

      return badges;
    } catch (error) {
      console.error("Error retrieving badges:", error);
      setErrorMessage(error.message);
      return [];
    }
  };
  const getUserBadges = async (npub = localStorage.getItem("local_npub")) => {
    try {
      const connection = await connectToNostr();
      if (!connection) return [];

      const { ndkInstance } = connection;
      const hexNpub = getHexNPub(npub); // Convert npub to hex

      // Create a filter for badge award events (kind 30009) where the user is the recipient
      const filter = {
        kinds: [NDKKind.BadgeAward], // Kind 30009 for badge awards
        "#p": [hexNpub], // Filter by the user's hex-encoded public key as the recipient
        limit: 100, // Adjust the limit as needed
      };

      const subscription = ndkInstance.subscribe(filter, { closeOnEose: true });

      const badges = [];

      subscription.on("event", (event) => {
        const badgeInfo = {
          content: event.content,
          createdAt: event.created_at,
          tags: event.tags,
        };
        badges.push(badgeInfo);
      });

      await new Promise((resolve) => subscription.on("eose", resolve));

      const uniqueNAddresses = [
        ...new Set(
          badges.flatMap(
            (badge) =>
              badge.tags
                .filter((tag) => tag[0] === "a" && tag[1]) // Find tags where the first element is "a"
                .map((tag) => tag[1]) // Extract the naddress
          )
        ),
      ];

      let badgeData = uniqueNAddresses.map((naddress) =>
        getBadgeData(naddress)
      );

      let resolvedBadges = await Promise.all(badgeData);

      const formattedBadges = [];

      // Loop through each outer array in the badgeDataArray
      resolvedBadges.forEach((badgeArray) => {
        // For each inner badge object array (which should have one object), extract name and image

        badgeArray.forEach((badge) => {
          let name = "";
          let image = "";

          badge.tags.forEach((tag) => {
            if (tag[0] === "name") {
              name = tag[1];
            }
            if (tag[0] === "image") {
              image = tag[1];
            }
          });

          // Push the object containing name and image to the badges array
          if (name && image) {
            formattedBadges.push({
              name,
              image,
              badgeAddress: badge.badgeAddress,
            });
          }
        });
      });

      return formattedBadges;
    } catch (error) {
      console.error("Error retrieving badges:", error);
      return [];
    }
  };

  const getLastNotesByNpub = async (
    npub = localStorage.getItem("local_npub")
  ) => {
    try {
      const connection = await connectToNostr();
      if (!connection) return [];

      const { ndkInstance } = connection;
      const hexNpub = getHexNPub(npub); // Convert npub to hex

      // Create a filter for kind: 1 (text notes) by the author
      const filter = {
        kinds: [NDKKind.Text], // Kind 1 is for text notes
        authors: [hexNpub], // Filter by the author's public key
        limit: 5, // Limit to the last 100 events
      };

      // Create a subscription to fetch the events
      const subscription = ndkInstance.subscribe(filter, { closeOnEose: true });

      const notes = [];

      subscription.on("event", (event) => {
        notes.push({
          content: event.content,
          createdAt: event.created_at,
          tags: event.tags,
          id: event.id,
        });
      });

      // Wait for the subscription to finish
      await new Promise((resolve) => subscription.on("eose", resolve));

      // Return the retrieved notes

      return notes;
    } catch (error) {
      console.error("Error retrieving notes:", error);
      setErrorMessage(error.message);
      return [];
    }
  };
  const getGlobalNotesWithProfilesByHashtag = async (
    hashtag = "LearnWithNostr"
  ) => {
    try {
      const connection = await connectToNostr();
      if (!connection) return [];

      const { ndkInstance } = connection;

      // Step 1: Fetch notes with the hashtag
      const notesFilter = {
        kinds: [NDKKind.Text], // Kind 1 for text notes
        "#t": [hashtag], // Filter for the hashtag
        limit: 50, // Adjust the limit as needed
      };

      const notesSubscription = ndkInstance.subscribe(notesFilter, {
        closeOnEose: true,
      });

      const notes = [];
      const pubkeys = new Set(); // To store unique pubkeys

      notesSubscription.on("event", (event) => {
        notes.push({
          content: event.content,
          createdAt: event.created_at,
          tags: event.tags,
          id: event.id,
          pubkey: event.pubkey, // Store the pubkey for later use
          npub: bech32.encode(
            "npub",
            bech32.toWords(Buffer.from(event.pubkey, "hex"))
          ),
          profile: null, // Placeholder for profile data
        });
        pubkeys.add(event.pubkey); // Add the author's pubkey to the set
      });

      await new Promise((resolve) => notesSubscription.on("eose", resolve));

      // Step 2: Fetch profiles for all unique pubkeys
      const profilesFilter = {
        kinds: [NDKKind.Metadata], // Kind 0 for metadata
        authors: Array.from(pubkeys), // Batch query for all pubkeys
      };

      const profilesSubscription = ndkInstance.subscribe(profilesFilter, {
        closeOnEose: true,
      });

      const profilesMap = new Map(); // Map to store profiles by pubkey

      profilesSubscription.on("event", (event) => {
        const metadata = JSON.parse(event.content);
        profilesMap.set(event.pubkey, {
          name: metadata.name || "New Private User",
          about: metadata.about || "",
          picture: metadata.picture || "",
        });
      });

      await new Promise((resolve) => profilesSubscription.on("eose", resolve));

      // Step 3: Merge notes with profiles
      const notesWithProfiles = notes.map((note) => {
        note.profile = profilesMap.get(note.pubkey) || {
          name: "New Private User",
          about: "",
          picture: "",
        };
        return note;
      });

      return notesWithProfiles;
    } catch (error) {
      console.error("Error fetching notes with profiles:", error);
      return [];
    }
  };

  return {
    isConnected,
    errorMessage,
    nostrPubKey,
    nostrPrivKey,
    generateNostrKeys,
    postNostrContent,
    auth,
    assignExistingBadgeToNpub,
    getUserBadges,
    getLastNotesByNpub,
    getGlobalNotesWithProfilesByHashtag,
  };
};

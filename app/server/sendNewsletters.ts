const supabaseClient = require("./supabaseConfig.ts");
const sendTempEmail = require("../lib/awsSes/sendTemplatedEmail.ts")

async function sendNewsletters() {
  try {
    // Fetch all users

    const users = await getUsers("user_id, name, email, latest_send_date");

    // Loop through users and fetch their subscriptions
    for (const user of users) {

      const podcastSummariesOfUser = []

      //subscriptions: array of objects
      const subscriptionsOfUser = await getSubsriptionsOfUser(user.user_id);

      for (const subscription of subscriptionsOfUser) {
        const podcastsOfChannel = await getPodcastsOfChannel(subscription.channel_id, user.latest_send_date)

        podcastSummariesOfUser.push(...podcastsOfChannel)

      }

      if (podcastSummariesOfUser.length < 1) continue //skip users that don't have new episodes

      //3 SANITIZATION: summary jsonokat itt, egyéb infókat a JSON.stringifynál (vagy azt inkább itt összeállítani és egyben lepasszolni mindet summaryvel együtt? és handlebars if-else templateben!!!)
      //lehet savelni kéne ezeket a végső-végső jsonokat db-be minden usernek h vissza lehessen keresni error keresés, monitoring, minőségellenőrzés szempontjából
      const sanitizedPodcastSummaries = podcastSummariesOfUser.map(summary => {
        return {
          name: summary.name || 'No Title Provided',
          podcast_created_at: summary.podcast_created_at || 'No Date Provided'
        };
      });

      createFinalJson and sanitize() és majd ezt lepasszolni h ne kelljen prop drillelni!
      mentse is el egyben

      await sendTempEmail(user.name, sanitizedPodcastSummaries)

      //egyelőre hagyjuk h mivan ha több mint x... minden feliratkozott channelre megkapsz mindent
      //create array =>  handlebars kiloopolja!!
      // sendTempEmail() argumentbe bepasszolni amit kell pl email, név, stb vagy csak user object egyben? kérdezni chatgpt-t h melyik a clean code approach
      //valahol itt UPDATE latest_send_date minden usernek és akkor kövi iterációnál már ezt nézi.
    }

    console.log("Newsletters sent successfully");
  } catch (error) {
    console.error(
      "Error occurred while retrieving podcasts/sending newslletters:",
      error
    );
  }
}

const getUsers = async (columns) => {
  const { data: users, error: userError } = await supabaseClient
    .from("users")
    .select(columns);

  if (userError) {
    throw userError;
  }

  return users;
};

const getSubsriptionsOfUser = async (userID) => {
  const { data: subscriptions, error: subscriptionError } = await supabaseClient
    .from("subscriptions")
    .select("channel_id, podcast_channels(name)") //podcast_channels(name, popularity, lastEpisodeDate, stc)
    .eq("user_id", userID);

  if (subscriptionError) {
    throw subscriptionError;
  }

  return subscriptions;
};

const getPodcastsOfChannel = async (channelID, userLatestSendDate) => {
  const { data: podcastsOfChannel, error: podcastError } = await supabaseClient
    .from("podcasts")
    .select("name, podcast_created_at")
    .eq("channel_id", channelID)
    .gte("podcast_created_at", userLatestSendDate); //we're using podcast_created_at, not date_published!

  if (podcastError) {
    throw podcastError;
  }

  return podcastsOfChannel;
};

sendNewsletters();

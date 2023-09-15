//get episode info and save to db
require("dotenv").config({ path: require("find-config")(".env") });
const ax = require('axios');
const supabaseAPI = require("../../server/supabaseConfig.ts");


const taddyURL = 'https://api.taddy.org';

const headers = {
  'Content-Type': 'application/json',
  'X-USER-ID': process.env.TADDY_USER_ID,
  'X-API-KEY': process.env.TADDY_API_KEY
};

async function fetchDataAndInsert(episodeUUID) {
    try {

      //episodeUUID instead of episode name
      const data = {
        query: '{ getPodcastEpisode(name:"HVAC for fun, profit and not buying yourself a job in Toledo") { uuid name imageUrl datePublished audioUrl duration episodeType podcastSeries {uuid name} } }'
      }

      const response = await ax.post(taddyURL, data, { headers });
      const podcastData = response.data.data.getPodcastEpisode

      console.log(podcastData)
  
      // Insert podcast data into Supabase
      const { data: insertData, error } = await supabaseAPI
        .from('podcasts')
        .insert([
          {
            uuid: podcastData.uuid,
            name: podcastData.name,
            image_url: podcastData.imageUrl,
            date_published: new Date(podcastData.datePublished*1000), //new Date(podcastData.datePublished*1000).toLocaleDateString('en-GB', { timeZone: 'Europe/London' }),
            audio_url: podcastData.audioUrl,
            duration: podcastData.duration,
            channel_id: podcastData.podcastSeries.uuid
          },
        ])
        .select();
  
      if (error) {
        console.error('Error inserting data into Supabase:', error);
        throw error
      } else {
        console.log('Data inserted into Supabase:', insertData);
      }

      return podcastData

    } catch (error) {
      console.error('Error fetching data from Taddy:', error);
    }

  }

module.exports = fetchDataAndInsert
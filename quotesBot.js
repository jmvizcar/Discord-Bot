"use strict";
const {MongoClient} = require('mongodb');
const {Client: DiscordClient, MessageAttachment, MessageEmbed} = require('discord.js');   
require('dotenv').config();

// All of the following data will be retrieved from a provided .env file.
const user = process.env.BOTNAME;
const password = process.env.BOTPWRD;
const cluster = process.env.CLUSTER;
const dbname = process.env.DBNAME;
const permissions = process.env.PERM;

//Combining the above sensitive invormation to form the uri to access the MongoDB collection.
const uri = `mongodb+srv://${user}:${password}@${cluster}/${dbname}${permissions}`;
    
// Assigning the DiscordBot Token from provided .env file.
const token = process.env.TOKEN;
    
const mdbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const disClient = new DiscordClient();

/**
 * The function will take an object, req, as a parameter.
 * From req, the function will determine whether to retrieve a value from the collection, or update a collection.
 * If retrieving, the function will query the collection, searching based on aliases, then return the document that
 * matches.
 * If update, the function will push an object that contains a string and Date object onto the document's quotes array.
 * Then return update successfully or not.
 * Else it will return an error.
 */
async function DBManager(req) {
    var res = {};
    try{
        const database = mdbClient.db(dbname);
        const collection = database.collection("quotees");
        if(req.command === "get"){
            const query = { alias : req.name }; // The alias used to search the collection.
            const options = { sort: { name: 1 }, projection: {_id: 0}};// to not transfer the ID
            res = await collection.findOne(query, options)
                            .then((res) => {return res;})
                            .catch((err) => {
                                console.log("In the DBM error function: " + err);res.err = 1; return res;});
            
        }else if(req.command === "add"){
            const query = { alias : req.name }; // The alias used to search the collection.
            //The update will be an object that contains a string and a Date 
            const update = {
                $push : {quotes: { quote : req.quote, time  : req.time}}
            };
            res = await collection.updateOne(query, update)
                                  .then((res) => {return res;})
                                  .catch((err) => {err.err = 1; return err;});
        } 
        
    } catch{
        console.log("An error has occured.");
    } finally {
        return res;
        // This returns the actual Object in the end. The previous returns are to assign res its value.

    }
}

disClient.on('ready', () => {
    console.log("I'm ready");
});

/* *
 * On receiving a message, the bot will parse the statement for commands, and respond accordingly
 * The object that it returns will depend on the command.
 * If the command is "get" it will create a JSON object containing the command, and alias of a quoter.
 * It will then call the DBManger function to retrieve the desired document and pick a quote at random
 * The function will then post the quote in an embedded message with the gathered data.
 * 
 * If the command is "add" it will create a JSON object containing the quoter's alias, the quote, and 
 * a Date Object. It will then call the DBManager function to update the respective document.
 * This function will then post whether the quote was successfully saved or not.
 */
disClient.on('message', async (message) => {
    var req = {};// variable used to hold the object being sent to DBManager
    var res = {};// return variable   
    const prefix = "/quote";
    // If the message does not start with the desired prefix or is a bot, do nothing.
    if(!message.content.startsWith(prefix) || message.author.bot) return;
    
    // Splitting the string into an array, while simultaneously cutting out the prefix.
    const args = message.content.slice(prefix.length).trim().split(' ');
    // Extracting the command from the argument list, popping it off, and shifting it to lower case.
    const command = args.shift().toLowerCase();
    if(command === "get"){
        // Combining the alias into a full name. toLowerCase is to match the name with a potential alias.
        let name = args.join(' ').toLowerCase();
        req.command = command;
        req.name = name;
        res = await DBManager(req)
                .then((res) => {return res;})
                .catch((err) => {err.err = 1; return err;});
    } else if(command === "add") {
        let name = args.shift().toLowerCase();
        while (args[0] != '-') {
            name.concat(args.shift.toLowerCase());
        }
        args.shift(); // This is to remove the '-' that separates the name from the quote.
        let quote = args.join(' ');// This will combine the remaining elements into one string.
        req.command = command;
        req.name = name;
        req.quote = quote;
        req.time = new Date();
        res = await DBManager(req)
                .then((res) => {return res;})
                .catch((err) => {err.err = 1;return err;});       
    } else {
        res.err = 1;
        res.invalidCom = 1;// this raises the flag that an invalid command was given.
    }
    
    if(res === null || res.err){
        // If an error did occur, it will first check to see if the error is resulting from an invalid command.
        if(res.invalidCom) message.channel.send("I do not recognize that command. No no");
        // If res is null then that means that no user with the alias has been found, and will output an error.
         else if (res === null) message.channel.send("I could not find that name. No no.");
        // If updateOne function was called, then res will have a modifiedCount. And if it is 0 no update was made.
         else if (!res.modifiedCount) message.channel.send("I could not add that quote. No no");
         else message.channel.send("Something went wrong, please try again.");
    // The bot successfully added/found the quote.
    } else {
            // If the call was to add a quote it will confirm the recording. Else it will output a random quote from
            // the document.
            if(res.modifiedCount){
                let nameCap = req.name.charAt(0).toUpperCase() + req.name.slice(1);
                message.channel.send(nameCap +"'s quote has been recorded. Yes Yes.")
                    .then(message.delete({timeout: 500}))
                    .catch((err) => {console.log("This has been the source of your conflict" + err)});
            } else {
               // If the person has a document and a nonzero amount of quotes display a random quote. Else state that
               // the person has no quotes.
               if(res.quotes.length){
                let name = res.name;
                let quote_N = Math.floor(Math.random() * res.quotes.length);// Selecting a quote at random.
                let quote = res.quotes[quote_N].quote;
                let time = res.quotes[quote_N].time;

                const quoteEmb = new MessageEmbed()
                    .setAuthor(name)
                    .setDescription(quote)
                    .setFooter(time.toDateString() + '\t' + time.toLocaleTimeString('en-US'));
                    
                message.channel.send(quoteEmb)
                    .then(message.delete({timeout: 500}))
                    .catch((err) => {console.log(err)});
                } else {
                    message.channel.send("I am afraid that " + res.name + " has not said anything of note yet.");
                }
            }
      } 
});

mdbClient.connect()
    .then((res) => disClient.login(token))
    .catch((err) => console.log(err));

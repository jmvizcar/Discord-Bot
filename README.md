# QuotesBot
A fun little bot that saves quotes in text format to a MongoDB database.

## Required packets
Requires discord.js, mongodb.js, and dotenv.js

## Setup
Access to the MongoDB is done with username/password combination and will take from the .env package the login information to form the following string:

BOTNAME=username  
BOTPWRD=password  
CLUSTER=cluster  
DBNAME=Mongodb database name  
PERM=read-write permission (this string should start with a '?')

Once the .env file has been set up, the bot will log into MongoDB
## Commands
All commands will start with "/quote".  
As of now, it currently has two commands: get and add
### Get
The get command requires an alias for lookup. The bot will then query the database for the person and retrieve a random quote from the document.  Example: /quote get tester
### Add
The add command requires an alias and a string. The alias and string should be separated by a "-" with spaces on both sides. The bot will then query the database to update the existing document with the new quote.  
Example: /quote add tester - This is a quote!

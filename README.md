## Telepathy Backend With Node.js, MongoDB

### project dependencies

1. we use from [sharp](https://github.com/lovell/sharp) module for resize images, follow [this document](http://sharp.dimens.io/en/stable/install/) to install sharp module prerequisites.

2. create project inside [Google Developer Console](https://console.developers.google.com)

3. for enable Google Cloud Messages (GCM) follow this [link](https://developers.google.com/mobile/add?platform=android&cntapi=gcm) , select project name like **Demo App** and android package name **com.atahani.telepathy**
	then enable GCM service button
    store `Server API Key` and `Sender ID` values in safe
    finally click on generate configuration `google-services.json` file, it will be use in android application.

### how to use from this project

##### clone the repository
```
git clone https://github.com/atahani/telepathy-backend.git
cd telepathy-backend
```

##### install nodejs module via npm
```
 npm install
```

NOTE: all of config files are inside `config/env` path, put `Server API Key`, `Sender ID` and `Android Package Name` inside `development.js` file as `gcm_api_key`, `sender_id` and `android_app_package_name` fields

##### run the application in `Development` mode
```
grunt
```

##### you can build and run in `Production` mode
```
grunt build
NODE_ENV production
node server.js
```

##### also you can build docker image and run this

```
docker build -t telepathy_app .
docker run -d -p 5000:80 -v /path/to/telepathy/media:/app/telepathy-app/public/media --name telepathy_app_1 telepathy_app
```

###### serve introduction application web page in 
`http://localhost:5000`


#### API Endpoint

The following table summarises all the available resource URIs, and the effect of each verb on them. Each of them is relative to the base URI for this API: `http://localhost:5000/api/v1/`


| Resource                                      | GET                                        | POST                                    | PATCH                  | DELETE                                  |
| ----------------------------------------------| -------------------------------------------| ----------------------------------------| -----------------------| ----------------------------------------| 
| [/signin](#client-signin)                     | N/A                                        | user information to get access token    | N/A                    | N/A                                     |
| [/oauth/refreshtoken](#get-new-access-token)  | N/A                                        | get new access token when is not valid  | N/A                    | N/A                                     |
| [/register/device](#register-user-device)     | N/A                                        | device information when register in GCM | N/A                    | Deletes a reader                        |
| [/user/username/check](#check-username)       | N/A                                        | check username availability             | N/A                    | N/A                                     |
| [/user/profile](#user-profile)                | get user profile information               | update user profile information         | N/A                    | N/A                                     |
| [/user/profile/image](#user-image-profile)    | N/A                                        | upload new user profile                 | N/A                    | remove current user image profile       |
| [/user/app/{app_id}](#user-logout)            | N/A                                        | N/A                                     | N/A                    | terminate application by app_id         |
| [/readerLogins/{id}](#reader-login)           | Gets the details of a single reader login  | N/A                                     | N/A                    | N/A                                     |
| [/user/search](#search-user)                  | search in users by query string            | N/A                                     | N/A                    | N/A                                     |
| [/user/{user__id}](#get-user-information)     | get user information by user_id            | N/A                                     | N/A                    | N/A                                     |
| [/user/account](#delete-user-account)         | N/A                                        | N/A                                     | N/A                    | delete user account and all information |
| [/friends](#get-friends)                      | get friends list                           | N/A                                     | N/A                    | N/A                                     |
| [/friends/{user_id}](#friend)                 | get friend information                     | create new friend with user_id          | N/A                    | delete friend by user_id                |
| [/telepathy](#get-telepathies)                | get telepathies                            | N/A                                     | N/A                    | N/A                                     |    
| [/telepathy/{telepathy_id}](#telepathy)       | get one telepathy by id                    | create new telepathy                    | N/A                    | remove telepathy by telepathy_id        |
| [/message/classify](#get-classify-messages)   | get classify messages                      | N/A                                     | N/A                    | N/A                                     |
| [/message](#get-messages)                     | get message list                           | N/A                                     | N/A                    | remove message by message_id            |
| [/message/receive](#reciev-message)           | N/A                                        | N/A                                     | set message as receive | N/A                                     |
| [/message/read](#read-message)                | N/A                                        | N/A                                     | set message as read    | N/A                                     |
| [/message/{message_id}](#message)             | get message by message_id                  | N/A                                     | N/A                    | delete message by message_id            |
 

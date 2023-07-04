# @brezel/api-client

This is a simple JavaScript SDK for interacting with the Brezel API.

## Getting Started

To use it, you need to initialize it with your API key or user access token, your Brezel system, and API endpoint URI as shown below.

```jsx
import Brezel from '@brezel-js/api-client';

const client = new Brezel({
    uri: 'https://api.example.com',
    system: 'test',
    key: 'testKey', // either via API key
    token: 'testToken', // ... or via an OAuth access token
});
```

## Usage

### Modules

#### Fetching all modules

```jsx
client.fetchModules().then(modules => console.log(modules));
```

#### Fetching a specific module

```jsx
client.fetchModule('moduleIdentifier').then(result => console.log(result));
```

### Entities

#### Fetch entities of a specific module

```jsx
client.fetchEntities('moduleIdentifier').then(result => console.log(result));
```

#### Fetch a specific entity by its ID
```jsx
client.fetchEntity(7, 'moduleIdentifier').then(result => console.log(result));
```

#### Create a new entity
```jsx
const entity = {
    module: {
        identifier: 'module1'
    },
    // Fields
    name: 'My Entity',
    // ...
};
client.createEntity(entity).then(result => console.log(result));
```

#### Update an entity
```jsx
const entity = {
    id: 9,
    module: {
        identifier: 'module1'
    },
    // Fields
    name: 'My Entity',
    // ...
};
client.updateEntity(entity).then(result => console.log(result));
```

#### Save an entity

This method updates an existing entity, or creates a new entity if the ID is undefined.

```jsx
const entity = {
    id: 9, // optional
    module: {
        identifier: 'module1'
    },
    // Fields
    name: 'My Entity',
    // ...
};
client.saveEntity(entity).then(result => console.log(result));
```

#### Filters
Data can be filtered when fetching entities by using a syntax like this:

```jsx
client.fetchEntities('songs', {
    page: 1, // optional
    filters: [{
        column: 'album.title',
        operator: '=',
        value: 'Emotion'
    }]
}).then(result => console.log(result));
```

This will fetch only the entities having the relation `album` with the title `'Emotion'`.


### Fetch contents of a file

You can also fetch the contents of specific file entity by its entity ID. Given a file with an ID of "123", here's how you can retrieve the file:

```jsx
client.fetchFile(123)
    .then(blob => {
        // Do something with the blob, e.g. generate a download URL
        const url = window.URL.createObjectURL(blob);
        console.log(url);
    });
```

The `fetchFile()` method retrieves a Blob object that represents the file's data. You can use this Blob object to create a local URL, which you can then use to embed the file in a webpage or download it to the user's computer.


## Unit Tests

To run the unit tests:

`npm run test`


## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
MIT

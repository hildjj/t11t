# t11t

Run a ThunderClient-exported collection from the CLI.

## Installation

```sh
deno install -rf --allow-net --allow-read --allow-env --name t11t https://raw.githubusercontent.com/hildjj/t11t/main/main.ts
```

## Usage

1. Export your collection from ThunderClient. It will write a .json file.
1. `t11t list -i collection.json` lists all potential requests.
1. `t11t run -i collection.json UUID` runs one or more requests.
1. Write a definition.json file that includes the path to your collection, any initial environment variables, and a list of requests:

```jsonc
{
  "inputFile": "thunder-collection.json",
  "environment": {
    "port": "8001"
  },
  "requests": [
    {
      "_id": "00000000-0000-0000-0000-000000000000", // UUID from list
      "name": "Create user (fail)", // Optional description
      "expectCode": 401 // Defaults to 200
    }
  ]
}
```

5. Run tests with `t11t -d definition.jsoc`

## Note

I am not affiliated with the ThunderClient team. This code has not been
cleared with them in any way, nor do I expect it to be since it duplicates
(badly) existing code of theirs. It is a very quick hack that only handles my
particular use case, and is not meant to be generally-usable by others.

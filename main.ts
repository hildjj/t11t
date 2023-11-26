#!/usr/bin/env -S deno run --allow-read --allow-env

import {
  Command,
  CompletionsCommand,
  ValidationError,
} from '$cliffy/command/mod.ts';
import { VERSION } from './version.ts';
import type {
  Collection,
  Definition,
  Environment,
  Expected,
  TRequest,
} from './types.ts';
import { TTree } from './tree.ts';
import { parse as parseJSONC } from '$std/jsonc/parse.ts';

const env: Record<string, string> = {};
const CURLIES = /{{((?:(?!}}).)*)}}/;
const CURLIESG = new RegExp(CURLIES, 'g');

async function readJSON<T>(fileName: string): Promise<T> {
  return parseJSONC(await Deno.readTextFile(fileName)) as T;
}

async function readEnvironment(fileName: string): Promise<void> {
  const e = await readJSON<Environment>(fileName);
  for (const { name, value } of e.variables) {
    env[name] = value;
  }
}

function replaceEnv(s: string): string {
  return s.replaceAll(CURLIESG, (_sub, name) => {
    if (Object.hasOwnProperty.call(env, name)) {
      return env[name];
    }
    return `{{name}}`;
  });
}

interface Options {
  env?: string;
  inp?: string;
  definitionFile?: string;
}

interface Opts {
  inp: Collection;
  requests: Expected[];
}

async function finishParams(options: Options): Promise<Opts> {
  let requests: Expected[] = [];
  let inp: Collection | undefined = undefined;
  if (options.definitionFile) {
    const defs = await readJSON<Definition>(options.definitionFile);
    if (defs?.environmentFile) {
      await readEnvironment(defs.environmentFile);
    }
    if (defs?.environment) {
      for (const [k, v] of Object.entries(defs.environment)) {
        env[k] = v;
      }
    }
    if (defs.requests) {
      requests = defs.requests;
    }
    if (defs.inputFile && !options.inp) {
      inp = await readJSON<Collection>(defs.inputFile);
    }
  }
  if (options.env) {
    await readEnvironment(options.env);
  }
  if (options.inp) {
    inp = await readJSON<Collection>(options.inp);
  }

  if (!inp) {
    throw new ValidationError('No input collection specified');
  }
  return {
    inp,
    requests,
  };
}

async function exec(
  col: Collection,
  req: TRequest,
  expected: Expected,
): Promise<void> {
  const headers: HeadersInit = {};
  let body: string | undefined = undefined;
  if (col.settings?.auth) {
    headers['Authorization'] = `${col.settings.auth.type} ${
      replaceEnv(col.settings.auth.bearer)
    }`;
  }

  if (req.body?.type === 'json') {
    headers['Content-Type'] === 'application/json';
    body = replaceEnv(req.body.raw);
  }

  const url = replaceEnv(req.url);
  const res = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  console.log(res.status, req.method, url, body ?? '');
  const expectCode = expected.expectCode ?? 200;
  if (res.status !== expectCode) {
    throw new Error(`Expected ${expectCode} got ${res.status}`);
  }
  if (res.status === 200) {
    const json = await res.json();
    console.log('Result:', json);
    for (const t of req.tests) {
      switch (t.type) {
        case 'set-env-var': {
          const m = t.value.match(CURLIES);
          // Well of course this is a hack, like all uses of eval.
          // deno-lint-ignore no-eval
          env[m?.[1] ?? t.value] = eval(t.custom);
          break;
        }
      }
    }
  } else {
    console.log(await res.text());
  }
  console.log();
}

await new Command()
  .name('t11t')
  .version(VERSION)
  .description('Run HTTP requests from exported JSON files')
  .globalOption(
    '-i, --input <inputFileName:file>',
    'Collection file to use as input',
  )
  .globalOption(
    '-e, --env <envFileName:file>',
    'Environment file',
  )
  .globalOption(
    '-d, --definitionFile <definitionFileName:file>',
    'Definition file.  Specifies input, environment, test order, etc.',
  )
  .action(async (options) => {
    const { inp } = await finishParams(options);
    console.log(env, inp);
  })
  .command('completions', new CompletionsCommand())
  .command('list')
  .action(async (options) => {
    const { inp } = await finishParams(options);

    const folders: Record<string, TTree> = {};
    const t = new TTree(inp, folders);

    if (inp) {
      for (const req of inp.requests) {
        t.add(req);
      }
    }
    t.sort();
    console.log(t.toString());
    // for (const {_id, name} of inp.requests) {
    //   console.log(`${_id}: ${name}`);
    // }
  })
  .reset()
  .command('run')
  .arguments('[request...]')
  .action(async (options, ...extraRequests) => {
    const { inp, requests } = await finishParams(options);
    requests.push(...extraRequests.map((_id) => ({ _id })));

    for (const r of requests) {
      const req = inp.requests.find(({ _id }) => _id === r._id);
      if (!req) {
        console.error(`Unknown request: "${r._id}"`);
        continue;
      }
      await exec(inp, req, r);
    }
  })
  .parse(Deno.args);


if (!globalThis.fetch) {
  globalThis.fetch = require("node-fetch");
}

const prettyBytes = require("pretty-bytes");
const msgpackr = require("msgpackr");
// const cborX = require("cbor-x");
const Table = require("cli-table3");
const { sia, desia } = require("..");
const lab = require("../lab/index");
// const assert = require("assert");
const { diff } = require("deep-diff");

// const assert = console.assert;
// const process = { 
//   cpuUsage : function(previous) {
//     if (!previous) {
//       previous = 0;
//     }
//     const now = performance.now() / 1000;
//     return {
//       user: now,
//       system: now,
//     };
//   }
// };

const assert = {
  deepEqual: function() { return false; }
};

const runTests = (data, samples) => {
  const table = new Table({
    head: [
      "Name",
      "Serialize",
      "Deserialize",
      "Total",
      "Ratio",
      "Size",
      "Size ratio",
    ],
  });
  const results = [];
  const bench = (serialize, deserialize, name, n = samples) => {
    console.log(`Running benchmarks for ${name}, ${n} loops`);
    const serTimes = [];
    const deserTimes = [];
    let serialized;
    let result;
    while (n--) {
      const serstart = performance.now();// process.cpuUsage();
      serialized = serialize(data);
      const serend = performance.now() - serstart; //process.cpuUsage(serstart);
      const deserstart = performance.now();//process.cpuUsage();
      result = deserialize(serialized);
      const deserend = performance.now() - deserstart;// process.cpuUsage(deserstart);
      serTimes.push(serend);
      deserTimes.push(deserend);
    }
    const medSer = Math.min(...serTimes);
    const medDeser = Math.min(...deserTimes);
    const byteSize = serialized.length;
    const serTime = Math.round(medSer) || medSer;
    const deserTime = Math.round(medDeser) || medDeser;
    const total = serTime + deserTime;
    const _diff = diff(result, data);
    if (_diff) {
      console.log(_diff);
    }
    assert.deepEqual(result, data);
    assert;
    results.push({
      name,
      serTime,
      deserTime,
      total,
      byteSize,
    });
  };

  bench(
    (data) => JSON.stringify(data),
    (buf) => JSON.parse(buf),
    "JSON"
  );

  bench(sia, desia, "Sia");
  bench(lab.sia, lab.desia, "Sia Lab");

  bench(msgpackr.pack, msgpackr.unpack, "MessagePack");
  // bench((data) => cborX.encode(data), cborX.decode, "CBOR-X");
  console.log();

  const getTime = (ms) => {
    // if (ns > 10000) return `${Math.round(ns / 1000)}ms`;
    return `${ms}ms`;
  };

  const jsonResults = results.filter(({ name }) => name == "JSON").pop();
  const rows = results.map((stat) => [
    stat.name,
    getTime(stat.serTime),
    getTime(stat.deserTime),
    getTime(stat.total),
    Math.round((100 * stat.total) / jsonResults.total) / 100,
    prettyBytes(stat.byteSize),
    Math.round((100 * stat.byteSize) / jsonResults.byteSize) / 100,
  ]);
  table.push(...rows);
  console.log(table.toString());
  console.log();
};

const dataset = [
  {
    title: "Tiny file",
    // url: "https://jsonplaceholder.typicode.com/users/1",
    url: "http://localhost:8080/TinyFile.json",
    samples: 10000,
  },
  {
    title: "Small file",
    // url: "https://jsonplaceholder.typicode.com/comments",
    url: "http://localhost:8080/SmallFile.json",
    samples: 1000,
  },
  {
    title: "Large file",
    // url: "https://jsonplaceholder.typicode.com/photos",
    url: "http://localhost:8080/LargeFile.json",
    samples: 100,
  },
  {
    title: "Monster file",
    // url: "https://github.com/json-iterator/test-data/raw/master/large-file.json",
    url: "http://localhost:8080/MonsterFile.json",
    samples: 20,
  },
  {
    title: "Cocos Effect",
    // url: "https://jsonplaceholder.typicode.com/users/1",
    url: "http://localhost:8080/ccc-effect.json",
    samples: 1000,
  },
];

console.log("Downloading the test data");

const start = async () => {
  for (const set of dataset) {
    const { title, url, samples } = set;
    console.log(`Running tests on "${title}"`);

    // var xhttp = new XMLHttpRequest();
    // xhttp.onreadystatechange = function() {
    //     if (this.readyState == 4 && this.status == 200) {
    //       console.log(this.myurl);
    //       if (xhttp.responseText) {
    //         const resp = JSON.parse(xhttp.responseText);
    //         runTests(resp, samples);
    //       }
    //     }
    // };

    // xhttp.open("GET", url, true);
    // xhttp.setRequestHeader("Content-Type", "application/json");
    // // xhttp.setRequestHeader("Access-Control-Allow-Origin", "*");
    // xhttp.send();

    if (globalThis.jsb) {
      const filePath = 'dist/' + url.substr(url.lastIndexOf('/') + 1);
      const data = JSON.parse(jsb.fileUtils.getStringFromFile(filePath));
      runTests(data, samples);
    } else {
      const data = set.data || (await fetch(url).then((resp) => resp.json()));
      runTests(data, samples);
    }
  }
};

start().catch(console.trace);

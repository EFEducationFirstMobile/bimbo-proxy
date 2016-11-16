# bimbo-proxy
A simple NodeJS proxy for QA automation.

**How does it work?**

bimbo-proxy can be configured as a proxy for the browser during your tests, it exposes rest APIs that allow you to programmatically fake calls to your backend services, so that you can simulate responses or error conditions to validate specific scenarios of your tests. 
Please note that only http is supported in faking responses, SSL connections are blindly proxied.

A rule is specified with a regex (that can be as simple as a string, you know :)) and associates a response that contais status code, headers and so on. The proxy by default starts on port 8888, but you can specify an alternative port on the command line.

To install a rule, simply POST agains the /admin/rules/ endpoint of the proxy, directly, specifying in the path the regex to use and in the body the result you want to obtain. The result can be as simple as this:
``` json
{
    "status": 599
}
```
Or as complex as this:
``` json
{
    "status": 201,
    "text": "{\"created\": true, \"message\": \"success!\", \"value\": 42}",
    "type": "application/json",
    "headers": [{
        "name": "cache-control",
        "value": "no-cache"
    }, {
        "name": "etag"
    }]
}
```
As you can see you can also remove headers from the response just specifying their name (no value)

To install a rule, for example to mock something called "status.html":
``` bash
curl -v -X POST -d '{"status":200, "text":"<html><body><h3>Hello folks!</h3></body></html>", "type":"text/html"}' http://localhost:8888/admin/rules/status.html
``` 
From now on, anything that contains "status.html" (it's a very lazy regexp!) will have returned the content you specified. Assuming you have that rule installed, you can verify thart works using for example this curl:
``` bash
curl -v -x http://localhost:8888 http://www.google.com/status.html
```
Otherwise, just configure your browser to use the proxy and try from there ;)

To remove that rule, simply use the DELETE verb on the same resource:
``` bash
curl -v -X DELETE http://localhost:8888/admin/rules/status.html
```
Simples!


**How do I run it?**

Easy steps:
- make sure you have node and npm installed (note: requires node 4.x+)
- clone the project
- npm install
- node index.js

You may want to install also nodemon in order to keep the proxy alive regardless of system problems.



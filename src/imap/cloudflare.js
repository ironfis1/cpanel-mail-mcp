// The only module that imports the Workers socket API. Node cannot load it, so the Worker imports
// this file on demand and unit tests pass a fake connect instead.
export { connect } from "cloudflare:sockets";

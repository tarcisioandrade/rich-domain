import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { container, Container } from "./container.js";

// Extend Fastify types
declare module "fastify" {
  interface FastifyInstance {
    container: Container;
  }
}

const diPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("container", container);
};

export default fp(diPlugin, {
  name: "di-container",
});

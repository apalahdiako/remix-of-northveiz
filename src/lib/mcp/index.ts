import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import getProduct from "./tools/get-product";
import listMyOrders from "./tools/list-my-orders";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "northveiz-mcp",
  title: "NORTHVEIZ",
  version: "0.1.0",
  instructions:
    "Tools for the NORTHVEIZ streetwear shop. Use `list_products`/`get_product` to browse the catalog. Authenticated users can call `list_my_orders` and `get_my_profile` to inspect their own account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, getProduct, listMyOrders, getMyProfile],
});

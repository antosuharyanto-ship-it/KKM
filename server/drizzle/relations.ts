import { relations } from "drizzle-orm/relations";
import { users, userAddresses, sellers, products } from "./schema";

export const userAddressesRelations = relations(userAddresses, ({one}) => ({
	user: one(users, {
		fields: [userAddresses.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userAddresses: many(userAddresses),
}));

export const productsRelations = relations(products, ({one}) => ({
	seller: one(sellers, {
		fields: [products.sellerId],
		references: [sellers.sellerId]
	}),
}));

export const sellersRelations = relations(sellers, ({many}) => ({
	products: many(products),
}));
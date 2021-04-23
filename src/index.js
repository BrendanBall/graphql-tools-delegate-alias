const { makeExecutableSchema } = require('@graphql-tools/schema')
const { stitchSchemas } = require('@graphql-tools/stitch')
const { batchDelegateToSchema } = require('@graphql-tools/batch-delegate')
// const { ApolloServer } = require('apollo-server')
const { graphql } = require('graphql')

let postsSchema = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      text: String!
    }

    type Query {
      postsByUserIds(userIds: [ID!]!): [[Post!]!]!
    }
  `,
  resolvers: { 
    Query: {
      postsByUserIds: (parent, { userIds }, ctx) => userIds.map(userId => [({
        id: `${userId}-post-1`,
        text: `text of post 1 for user ${userId}`,
      })])
    }
  }
});

let usersSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      email: String
    }

    type Query {
      userById(id: ID!): User!
    }
  `,
  resolvers: { 
    Query: {
      userById: (parent, { id }, ctx) => ({
        id,
        email: `${id}@example.com`,
      })
    }
  }
});

const schema = stitchSchemas({
  subschemas: [
    postsSchema,
    usersSchema,
  ],
  typeDefs: `
    extend type User {
      posts: [Post!]!
    }
  `,
  resolvers: {
    User: {
      posts: {
        selectionSet: `{ id }`,
        resolve: async (user, args, context, info)  => {
          const result = await batchDelegateToSchema({
            schema: postsSchema,
            operation: 'query',
            fieldName: 'postsByUserIds',
            key: user.id,
            argsFromKeys: (userIds) => ({ userIds }),
            returnType: postsSchema.getType('Query').getFields()['postsByUserIds'].type,
            context,
            info,
            // This breaks aliasing
            valuesFromResults: (results, keys) => results.map(r => [...r.map(p => ({ ...p }))])
          });
          console.log('delegate result symbols: ', Object.getOwnPropertySymbols(result[0]))
          console.log('delegate result: %j', result)
          return result
        },
      },
    },
  }
});

// const server = new ApolloServer({ schema, debug: true });

// server.listen().then(({ url }) => {
//   console.log(`🚀  Server ready at ${url}`);
// });

const query = `{
  userById(id: "u1") {
    id
    email
    posts {
      id
      body: text
    }
  }
}`

const result = graphql(schema, query)
result.then(r => console.log('query result: %j', r))
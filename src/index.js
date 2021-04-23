const { makeExecutableSchema } = require('@graphql-tools/schema')
const { stitchSchemas } = require('@graphql-tools/stitch')
const { delegateToSchema } = require('@graphql-tools/delegate')
const { graphql } = require('graphql')
const { ApolloServer } = require('apollo-server')

let postsSchema = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      text: String
      userId: ID!
    }

    type Query {
      postById(id: ID!): Post
    }
  `,
  resolvers: { 
    Query: {
      postById: (parent, { id }, ctx) => ({
        id,
        text: `text of post ${id}`,
        userId: '1'
      })
    }
  }
});

let usersSchema = makeExecutableSchema({
  typeDefs: `
    interface User {
      id: ID!
      email: String
    }

    type AdminUser implements User {
      id: ID!
      email: String!
      name: String!
    }

    type Query {
      userById(id: ID!): User
    }
  `,
  resolvers: { 
    Query: {
      userById: (parent, { id }, ctx) => ({
        __typename: 'AdminUser',
        id,
        email: `${id}@example.com`,
        name: 'Bob'
      })
    }
  }
});

// setup subschema configurations
const postsSubschema = { schema: postsSchema };
const usersSubschema = { schema: usersSchema };

const schema = stitchSchemas({
  subschemas: [
    postsSubschema,
    usersSubschema,
  ],
  typeDefs: `
    extend type Post {
      user: User!
    }
  `,
  resolvers: {
    Post: {
      user: {
        selectionSet: `{ userId }`,
        resolve: async (post, args, context, info)  => {
          const result = await delegateToSchema({
            schema: usersSubschema,
            operation: 'query',
            fieldName: 'userById',
            args: { id: post.userId },
            context,
            info,
          })
          console.log('delegate result: %j', result)
          return result
        },
      },
    },
  }
});

const query = `query {
  postById(id: "1") {
    id
    text
    user {
      ...AdminUser
    }
  }

  fragment AdminUser on AdminUser {
    id
    e: email
    n: name
  }
}`
// const result = graphql(schema, query, null, null, null)
// result.then(post => console.log('query result: %j', post))

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ schema });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
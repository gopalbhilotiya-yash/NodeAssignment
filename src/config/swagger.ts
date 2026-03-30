import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce Auth API',
      version: '1.0.0',
      description: 'Register & Login API for E-Commerce with JWT authentication',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
    tags: [
      { name: 'Auth',     description: 'Authentication endpoints' },
      { name: 'Admin',    description: 'Admin only endpoints' },
      { name: 'Products', description: 'Product management' },
      { name: 'Cart',     description: 'Shopping cart' },
      { name: 'Orders',   description: 'Order management' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email:     { type: 'string', format: 'email',   example: 'john@example.com' },
            password:  { type: 'string', minLength: 8,      example: 'Secret@123' },
            firstName: { type: 'string', minLength: 2,      example: 'John' },
            lastName:  { type: 'string', minLength: 2,      example: 'Doe' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string',                  example: 'Secret@123' },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            id:        { type: 'string', example: 'uuid-v4' },
            email:     { type: 'string', example: 'john@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName:  { type: 'string', example: 'Doe' },
            role:      { type: 'string', enum: ['admin', 'user'], example: 'user' },
          },
        },
        AuthSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user:        { $ref: '#/components/schemas/UserResponse' },
                accessToken: { type: 'string', example: 'eyJhbGci... (15min expiry)' },
              },
            },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            firstName: { type: 'string', minLength: 2, example: 'John' },
            lastName:  { type: 'string', minLength: 2, example: 'Doe' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmPassword'],
          properties: {
            currentPassword: { type: 'string', example: 'OldSecret@123' },
            newPassword:     { type: 'string', minLength: 8, example: 'NewSecret@123' },
            confirmPassword: { type: 'string', example: 'NewSecret@123' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },
        AdminCreateUserRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email:     { type: 'string', format: 'email', example: 'jane@example.com' },
            password:  { type: 'string', minLength: 8,   example: 'Secret@123' },
            firstName: { type: 'string', example: 'Jane' },
            lastName:  { type: 'string', example: 'Doe' },
            role:      { type: 'string', enum: ['admin', 'user'], example: 'user' },
          },
        },
        AdminUpdateUserRequest: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'Jane' },
            lastName:  { type: 'string', example: 'Doe' },
            isActive:  { type: 'boolean', example: true },
            role:      { type: 'string', enum: ['admin', 'user'], example: 'admin' },
          },
        },
        AdminUserResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id:        { type: 'string', example: 'uuid-v4' },
                    email:     { type: 'string', example: 'jane@example.com' },
                    firstName: { type: 'string', example: 'Jane' },
                    lastName:  { type: 'string', example: 'Doe' },
                    role:      { type: 'string', enum: ['admin', 'user'], example: 'user' },
                    isActive:  { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
        },
        AdminUsersResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id:        { type: 'string' },
                  email:     { type: 'string' },
                  firstName: { type: 'string' },
                  lastName:  { type: 'string' },
                  role:      { type: 'string', enum: ['admin', 'user'] },
                  isActive:  { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        ExportProductRequest: {
          type: 'object',
          required: ['format'],
          properties: {
            format:   { type: 'string', enum: ['xlsx', 'pdf'], example: 'xlsx' },
            category: { type: 'string', example: 'Footwear' },
            minPrice: { type: 'number', example: 10 },
            maxPrice: { type: 'number', example: 500 },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: ['name', 'description', 'price', 'stock', 'category'],
          properties: {
            name:        { type: 'string', example: 'Nike Air Max' },
            description: { type: 'string', example: 'Comfortable running shoes' },
            price:       { type: 'number', example: 99.99 },
            stock:       { type: 'integer', example: 50 },
            category:    { type: 'string', example: 'Footwear' },
            imageUrl:    { type: 'string', example: 'https://example.com/image.jpg' },
          },
        },
        UpdateProductRequest: {
          type: 'object',
          properties: {
            name:        { type: 'string', example: 'Nike Air Max' },
            description: { type: 'string', example: 'Comfortable running shoes' },
            price:       { type: 'number', example: 99.99 },
            stock:       { type: 'integer', example: 50 },
            category:    { type: 'string', example: 'Footwear' },
            imageUrl:    { type: 'string', example: 'https://example.com/image.jpg' },
          },
        },
        ProductResponse: {
          type: 'object',
          properties: {
            success:     { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id:          { type: 'string', example: 'uuid-v4' },
                name:        { type: 'string', example: 'Nike Air Max' },
                description: { type: 'string', example: 'Comfortable running shoes' },
                price:       { type: 'number', example: 99.99 },
                stock:       { type: 'integer', example: 50 },
                category:    { type: 'string', example: 'Footwear' },
                imageUrl:    { type: 'string', example: 'https://example.com/image.jpg' },
                isActive:    { type: 'boolean', example: true },
                createdAt:   { type: 'string', format: 'date-time' },
                updatedAt:   { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        PaginatedProductResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data:    { type: 'array', items: { $ref: '#/components/schemas/ProductResponse' } },
            meta: {
              type: 'object',
              properties: {
                total:      { type: 'integer', example: 100 },
                page:       { type: 'integer', example: 1 },
                limit:      { type: 'integer', example: 10 },
                totalPages: { type: 'integer', example: 10 },
                hasNext:    { type: 'boolean', example: true },
                hasPrev:    { type: 'boolean', example: false },
              },
            },
          },
        },
        AddToCartRequest: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', example: 'uuid-v4' },
            quantity:  { type: 'integer', example: 2 },
          },
        },
        UpdateCartItemRequest: {
          type: 'object',
          required: ['quantity'],
          properties: {
            quantity: { type: 'integer', example: 3 },
          },
        },
        CartResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id:     { type: 'string', example: 'uuid-v4' },
                userId: { type: 'string', example: 'uuid-v4' },
                total:  { type: 'number', example: 199.98 },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id:        { type: 'string' },
                      quantity:  { type: 'integer' },
                      product:   { $ref: '#/components/schemas/ProductResponse' },
                    },
                  },
                },
              },
            },
          },
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['shippingAddress'],
          properties: {
            shippingAddress: { type: 'string', example: '123 Main St, New York, NY 10001' },
          },
        },
        UpdateOrderStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], example: 'confirmed' },
          },
        },
        OrderResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id:              { type: 'string', example: 'uuid-v4' },
                userId:          { type: 'string', example: 'uuid-v4' },
                status:          { type: 'string', example: 'pending' },
                totalAmount:     { type: 'number', example: 199.98 },
                shippingAddress: { type: 'string', example: '123 Main St' },
                createdAt:       { type: 'string', format: 'date-time' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id:           { type: 'string' },
                      quantity:     { type: 'integer' },
                      priceAtOrder: { type: 'number' },
                      product:      { $ref: '#/components/schemas/ProductResponse' },
                    },
                  },
                },
              },
            },
          },
        },
        PaginatedOrderResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data:    { type: 'array', items: { $ref: '#/components/schemas/OrderResponse' } },
            meta: {
              type: 'object',
              properties: {
                total:      { type: 'integer', example: 5 },
                page:       { type: 'integer', example: 1 },
                limit:      { type: 'integer', example: 10 },
                totalPages: { type: 'integer', example: 1 },
                hasNext:    { type: 'boolean', example: false },
                hasPrev:    { type: 'boolean', example: false },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

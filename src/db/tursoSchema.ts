export const tursoSchemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      aadhaarNumber TEXT,
      role TEXT DEFAULT 'user',
      isPremium BOOLEAN DEFAULT 0,
      subscriptionPlan TEXT DEFAULT 'free',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      isVerified BOOLEAN DEFAULT 0,
      idDocument TEXT,
      googleId TEXT
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      priceLabel TEXT,
      billingPeriod TEXT DEFAULT 'month',
      deposit INTEGER NOT NULL,
      depositLabel TEXT,
      location TEXT NOT NULL,
      city TEXT NOT NULL,
      type TEXT DEFAULT 'Single Room',
      images TEXT NOT NULL,
      amenities TEXT NOT NULL,
      sourceLabel TEXT,
      sourceUrl TEXT,
      ownerId TEXT NOT NULL,
      lat REAL,
      lng REAL,
      isFeatured BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      moveInDate TEXT NOT NULL,
      duration INTEGER NOT NULL,
      people INTEGER NOT NULL,
      premiumIncluded BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'pending',
      serviceFee INTEGER DEFAULT 0,
      paymentFee INTEGER DEFAULT 0,
      totalAmount INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      moveInPackage TEXT,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      senderId TEXT NOT NULL,
      receiverId TEXT NOT NULL,
      roomId TEXT,
      content TEXT NOT NULL,
      isRead BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senderId) REFERENCES users(id),
      FOREIGN KEY (receiverId) REFERENCES users(id),
      FOREIGN KEY (roomId) REFERENCES rooms(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      priceLabel TEXT,
      providerId TEXT NOT NULL,
      providerName TEXT,
      providerPhone TEXT,
      providerEmail TEXT,
      city TEXT NOT NULL,
      image TEXT,
      highlights TEXT,
      address TEXT,
      sourceUrl TEXT,
      whatsappUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(providerId) REFERENCES users(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS saved_rooms (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id),
      UNIQUE(userId, roomId)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      bookingId TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      platformFee REAL NOT NULL,
      ownerAmount REAL NOT NULL,
      paymentStatus TEXT DEFAULT 'pending',
      paymentMethod TEXT DEFAULT 'manual',
      transactionId TEXT,
      paymentScreenshot TEXT,
      razorpayOrderId TEXT,
      razorpayPaymentId TEXT,
      razorpaySignature TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id),
      FOREIGN KEY(bookingId) REFERENCES bookings(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      amount REAL NOT NULL,
      upiId TEXT,
      status TEXT DEFAULT 'pending',
      transactionId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS premium_payments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 99,
      utrNumber TEXT NOT NULL,
      screenshot TEXT,
      status TEXT DEFAULT 'pending',
      reviewedBy TEXT,
      reviewedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(reviewedBy) REFERENCES users(id),
      UNIQUE(userId, utrNumber)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS rent_payments (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      amount REAL NOT NULL,
      utrNumber TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      verifiedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bookingId) REFERENCES bookings(id),
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id),
      FOREIGN KEY(ownerId) REFERENCES users(id),
      UNIQUE(bookingId)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS support_queries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      status TEXT DEFAULT 'not_resolved',
      adminRepliedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS support_query_messages (
      id TEXT PRIMARY KEY,
      queryId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderRole TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(queryId) REFERENCES support_queries(id),
      FOREIGN KEY(senderId) REFERENCES users(id)
    )
  `,
  "CREATE INDEX IF NOT EXISTS idx_rooms_city ON rooms(city)",
  "CREATE INDEX IF NOT EXISTS idx_rooms_location ON rooms(location)",
  "CREATE INDEX IF NOT EXISTS idx_rooms_price ON rooms(price)",
  "CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId)",
  "CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(roomId)",
  "CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId)",
  "CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId)",
];

export const tursoTableOrder = [
  "users",
  "rooms",
  "bookings",
  "reviews",
  "messages",
  "services",
  "saved_rooms",
  "payments",
  "payouts",
  "premium_payments",
  "rent_payments",
  "support_queries",
  "support_query_messages",
] as const;

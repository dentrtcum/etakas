if (process.env.NODE_ENV === "production") {
  throw new Error("Seed cannot run in production.");
}

console.log("Seed placeholder: Phase 2 adds synthetic demo records after schema creation.");

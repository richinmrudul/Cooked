CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_made DATE NOT NULL,
  photo_url VARCHAR(2048),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
  name VARCHAR(255) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS meal_tags (
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  tag_name VARCHAR(255) NOT NULL REFERENCES tags(name) ON DELETE CASCADE,
  PRIMARY KEY (meal_id, tag_name)
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit VARCHAR(50),
  PRIMARY KEY (meal_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS rankings (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  PRIMARY KEY (user_id, meal_id),
  UNIQUE (user_id, rank_position) -- Ensures a user can only have one meal per rank position
);
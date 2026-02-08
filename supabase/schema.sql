-- Big Matt's BBQ schema (context only)
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.customers (
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  source text,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.drop_inventory (
  bags_available integer NOT NULL,
  bags_reserved integer NOT NULL DEFAULT 0,
  bags_sold integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  drop_id bigint NOT NULL,
  product_id bigint NOT NULL,
  CONSTRAINT drop_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT drop_inventory_drop_id_fkey FOREIGN KEY (drop_id) REFERENCES public.drops(id),
  CONSTRAINT drop_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.drop_pickups (
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  instructions text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  drop_id bigint NOT NULL,
  pickup_location_id bigint NOT NULL,
  CONSTRAINT drop_pickups_pkey PRIMARY KEY (id),
  CONSTRAINT drop_pickups_drop_id_fkey FOREIGN KEY (drop_id) REFERENCES public.drops(id),
  CONSTRAINT drop_pickups_pickup_location_id_fkey FOREIGN KEY (pickup_location_id) REFERENCES public.pickup_locations(id)
);

CREATE TABLE public.drop_status (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text,
  viewable boolean NOT NULL DEFAULT false,
  CONSTRAINT drop_status_pkey PRIMARY KEY (id)
);

CREATE TABLE public.drops (
  name text NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  hero_copy text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  status bigint,
  CONSTRAINT drops_pkey PRIMARY KEY (id),
  CONSTRAINT drops_status_fkey FOREIGN KEY (status) REFERENCES public.drop_status(id)
);

CREATE TABLE public.email_log (
  email_type text NOT NULL,
  to_email text NOT NULL,
  status text NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  CONSTRAINT email_log_pkey PRIMARY KEY (id),
  CONSTRAINT email_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.mailing_list_subscribers (
  email text NOT NULL UNIQUE,
  source text DEFAULT 'site'::text,
  subscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  last_notified_at timestamp with time zone,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT mailing_list_subscribers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.order_items (
  qty_bags integer NOT NULL CHECK (qty_bags > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint NOT NULL,
  product_id bigint NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.order_status (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL,
  CONSTRAINT order_status_pkey PRIMARY KEY (id)
);

CREATE TABLE public.orders (
  order_number text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  drop_id bigint NOT NULL,
  pickup_id bigint NOT NULL,
  customer_id bigint NOT NULL,
  status bigint,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_drop_id_fkey FOREIGN KEY (drop_id) REFERENCES public.drops(id),
  CONSTRAINT orders_pickup_id_fkey FOREIGN KEY (pickup_id) REFERENCES public.drop_pickups(id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT orders_status_fkey FOREIGN KEY (status) REFERENCES public.order_status(id)
);

CREATE TABLE public.pickup_locations (
  name text NOT NULL,
  address text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT pickup_locations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_type (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  CONSTRAINT product_type_pkey PRIMARY KEY (id)
);

CREATE TABLE public.products (
  name text NOT NULL,
  description text,
  bag_size_lb numeric NOT NULL DEFAULT 0.50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  price real NOT NULL DEFAULT '0'::real,
  type bigint,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_type_fkey FOREIGN KEY (type) REFERENCES public.product_type(id)
);

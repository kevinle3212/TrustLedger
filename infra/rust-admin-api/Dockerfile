FROM rust:1.82-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY lib ./lib
COPY programs ./programs
RUN cargo build --release --workspace

FROM debian:bookworm-slim AS runtime
RUN useradd --create-home --uid 10001 trustledger
USER trustledger
WORKDIR /home/trustledger
COPY --from=build /app/target/release/trustledger-admin-api /usr/local/bin/trustledger-admin-api
EXPOSE 4100
ENV TRUSTLEDGER_ADMIN_API_BIND=0.0.0.0:4100
CMD ["trustledger-admin-api"]


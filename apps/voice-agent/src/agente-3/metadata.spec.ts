import {
  extraerJwtDeMetadata,
  extraerJwtDeSala,
  MetadataJwtNoEncontradoError,
  type ParticipanteConMetadata,
} from "./metadata";

describe("extraerJwtDeMetadata", () => {
  it("devuelve null si metadata es undefined/null/vacío", () => {
    expect(extraerJwtDeMetadata(undefined)).toBeNull();
    expect(extraerJwtDeMetadata(null)).toBeNull();
    expect(extraerJwtDeMetadata("")).toBeNull();
    expect(extraerJwtDeMetadata("   ")).toBeNull();
  });

  it("devuelve null si metadata no es JSON válido", () => {
    expect(extraerJwtDeMetadata("esto no es json")).toBeNull();
  });

  it("devuelve null si el JSON es válido pero no es un objeto", () => {
    expect(extraerJwtDeMetadata("42")).toBeNull();
    expect(extraerJwtDeMetadata('"un-string"')).toBeNull();
    expect(extraerJwtDeMetadata("null")).toBeNull();
  });

  it("devuelve null si el objeto no trae supabase_jwt", () => {
    expect(extraerJwtDeMetadata(JSON.stringify({ otra_clave: "valor" }))).toBeNull();
  });

  it("devuelve null si supabase_jwt no es un string o está vacío", () => {
    expect(extraerJwtDeMetadata(JSON.stringify({ supabase_jwt: 123 }))).toBeNull();
    expect(extraerJwtDeMetadata(JSON.stringify({ supabase_jwt: "" }))).toBeNull();
    expect(extraerJwtDeMetadata(JSON.stringify({ supabase_jwt: "   " }))).toBeNull();
  });

  it("extrae el JWT cuando el shape es el esperado", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.fake.payload";
    expect(extraerJwtDeMetadata(JSON.stringify({ supabase_jwt: jwt }))).toBe(jwt);
  });

  it("recorta espacios alrededor del JWT", () => {
    expect(extraerJwtDeMetadata(JSON.stringify({ supabase_jwt: "  jwt-con-espacios  " }))).toBe(
      "jwt-con-espacios",
    );
  });
});

describe("extraerJwtDeSala", () => {
  it("devuelve el JWT del primer participante que lo trae", () => {
    const participantes: ParticipanteConMetadata[] = [
      { identity: "cliente-sin-metadata", metadata: "" },
      { identity: "cliente-con-jwt", metadata: JSON.stringify({ supabase_jwt: "jwt-real" }) },
    ];
    expect(extraerJwtDeSala(participantes)).toBe("jwt-real");
  });

  it("lanza MetadataJwtNoEncontradoError si ningún participante lo trae", () => {
    const participantes: ParticipanteConMetadata[] = [
      { identity: "p1", metadata: "" },
      { identity: "p2", metadata: JSON.stringify({ otra_clave: 1 }) },
    ];
    expect(() => extraerJwtDeSala(participantes)).toThrow(MetadataJwtNoEncontradoError);
    expect(() => extraerJwtDeSala(participantes)).toThrow(/p1, p2/);
  });

  it("lanza MetadataJwtNoEncontradoError si la sala no tiene participantes", () => {
    expect(() => extraerJwtDeSala([])).toThrow(MetadataJwtNoEncontradoError);
  });
});

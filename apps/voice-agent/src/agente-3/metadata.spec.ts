import {
  extraerJwtDeMetadata,
  extraerJwtDeSala,
  MetadataJwtNoEncontradoError,
  type ParticipanteConMetadata,
} from "./metadata";

const JWT_VALIDO = "eyJhbGciOiJIUzI1NiJ9.fake.payload";

describe("extraerJwtDeMetadata", () => {
  it("devuelve null si metadata es undefined/null/vacío", () => {
    expect(extraerJwtDeMetadata(undefined)).toBeNull();
    expect(extraerJwtDeMetadata(null)).toBeNull();
    expect(extraerJwtDeMetadata("")).toBeNull();
    expect(extraerJwtDeMetadata("   ")).toBeNull();
  });

  it("devuelve null si el string no tiene forma de JWT (no son 3 segmentos)", () => {
    expect(extraerJwtDeMetadata("esto no es un jwt")).toBeNull();
    expect(extraerJwtDeMetadata("solo.dos")).toBeNull();
    expect(extraerJwtDeMetadata("a.b.c.d")).toBeNull();
  });

  it("devuelve null si algún segmento está vacío", () => {
    expect(extraerJwtDeMetadata("a..c")).toBeNull();
    expect(extraerJwtDeMetadata(".b.c")).toBeNull();
  });

  it("extrae el JWT crudo cuando tiene forma válida", () => {
    expect(extraerJwtDeMetadata(JWT_VALIDO)).toBe(JWT_VALIDO);
  });

  it("recorta espacios alrededor del JWT", () => {
    expect(extraerJwtDeMetadata(`  ${JWT_VALIDO}  `)).toBe(JWT_VALIDO);
  });
});

describe("extraerJwtDeSala", () => {
  it("devuelve el JWT del primer participante que lo trae", () => {
    const participantes: ParticipanteConMetadata[] = [
      { identity: "cliente-sin-metadata", metadata: "" },
      { identity: "cliente-con-jwt", metadata: JWT_VALIDO },
    ];
    expect(extraerJwtDeSala(participantes)).toBe(JWT_VALIDO);
  });

  it("lanza MetadataJwtNoEncontradoError si ningún participante lo trae", () => {
    const participantes: ParticipanteConMetadata[] = [
      { identity: "p1", metadata: "" },
      { identity: "p2", metadata: "no-es-un-jwt" },
    ];
    expect(() => extraerJwtDeSala(participantes)).toThrow(MetadataJwtNoEncontradoError);
    expect(() => extraerJwtDeSala(participantes)).toThrow(/p1, p2/);
  });

  it("lanza MetadataJwtNoEncontradoError si la sala no tiene participantes", () => {
    expect(() => extraerJwtDeSala([])).toThrow(MetadataJwtNoEncontradoError);
  });
});

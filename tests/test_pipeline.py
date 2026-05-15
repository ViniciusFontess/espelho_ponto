from src.pipeline import run

REAL_PDF = r"C:\Users\vinia\Downloads\Downloads Google\Pontomais_-_Espelho_de_Ponto_Eletrônico_(01.12.2025_-_31.12.2025)_-_7d75411016c30e83f99e9b14267fc2c24bb067f6f55fce4f074dcfd99c424735.pdf"


def test_pipeline_retorna_lista(tmp_path):
    results = run(REAL_PDF, output_dir=str(tmp_path))
    assert isinstance(results, list)
    assert len(results) > 0


def test_cada_resultado_tem_campos_obrigatorios(tmp_path):
    results = run(REAL_PDF, output_dir=str(tmp_path))
    campos = {"hash", "hash_presente", "hash_valido", "nome", "matricula",
              "cpf", "cargo", "equipe", "periodo", "dias", "assinatura"}
    for r in results:
        assert campos.issubset(r.keys()), f"Campos ausentes: {campos - r.keys()}"


def test_pipeline_extrai_funcionario_real(tmp_path):
    results = run(REAL_PDF, output_dir=str(tmp_path))
    funcionario = results[0]
    assert funcionario["nome"] == "JOSE DE SOUZA E SILVA NETO"
    assert funcionario["matricula"] == "00000694"


def test_pipeline_detecta_assinatura(tmp_path):
    results = run(REAL_PDF, output_dir=str(tmp_path))
    assert results[0]["hash_presente"] is True
    assert results[0]["hash_valido"] is True


def test_pipeline_cria_json(tmp_path):
    results = run(REAL_PDF, output_dir=str(tmp_path))
    jsons = list(tmp_path.glob("*.json"))
    assert len(jsons) == len(results)

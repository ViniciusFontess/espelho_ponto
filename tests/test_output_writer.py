import json
from pathlib import Path
from src.output_writer import write_employee_json

FUNCIONARIO = {
    "hash": "a98531ca7712124fa6892bb7ba3534e6",
    "hash_presente": True,
    "hash_valido": True,
    "nome": "JOSE DE SOUZA E SILVA NETO",
    "matricula": "00000694",
    "cpf": "041.809.611-21",
    "pis": "130.45018.38-5",
    "cargo": "ANALISTA DE SUPORTE DE SISTEMA II",
    "equipe": "UTIC - Unidade de Tecnologia da Informação e Comunicação",
    "periodo": "01/12/2025 - 31/12/2025",
    "dias": [
        {"data": "01/12/2025", "dia_semana": "Seg", "entrada_1": "07:34",
         "saida_1": "12:03", "entrada_2": "13:25", "saida_2": "16:52"}
    ],
    "assinatura": {
        "nome": "JOSE DE SOUZA E SILVA NETO (Colaborador)",
        "data_hora": "18/03/2026 às 09:15:34",
        "protocolo": "a98531ca7712124fa6892bb7ba3534e6",
    },
}


def test_cria_arquivo_json(tmp_path):
    filepath = write_employee_json(FUNCIONARIO, output_dir=str(tmp_path))
    assert filepath.exists()


def test_conteudo_json_correto(tmp_path):
    filepath = write_employee_json(FUNCIONARIO, output_dir=str(tmp_path))
    data = json.loads(filepath.read_text(encoding="utf-8"))
    assert data["nome"] == "JOSE DE SOUZA E SILVA NETO"
    assert data["matricula"] == "00000694"
    assert len(data["dias"]) == 1
    assert data["assinatura"]["protocolo"] == "a98531ca7712124fa6892bb7ba3534e6"


def test_nome_arquivo_usa_matricula(tmp_path):
    filepath = write_employee_json(FUNCIONARIO, output_dir=str(tmp_path))
    assert "00000694" in filepath.name


def test_cria_diretorio_se_nao_existir(tmp_path):
    output_dir = tmp_path / "novo_dir"
    write_employee_json(FUNCIONARIO, output_dir=str(output_dir))
    assert output_dir.exists()


def test_funcionario_sem_assinatura(tmp_path):
    sem_assinatura = {**FUNCIONARIO, "hash": None, "hash_presente": False,
                      "hash_valido": False, "assinatura": None}
    filepath = write_employee_json(sem_assinatura, output_dir=str(tmp_path))
    data = json.loads(filepath.read_text(encoding="utf-8"))
    assert data["hash_presente"] is False
    assert data["assinatura"] is None

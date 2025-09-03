import { addProduct } from './productService';
import { addCategory, getCategories } from './categoryService';
import { db } from '../../firebase';

export interface CSVProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  preparationTime?: number;
  available: boolean;
  // Traduções
  name_en?: string;
  name_es?: string;
  name_fr?: string;
  description_en?: string;
  description_es?: string;
  description_fr?: string;
}

export interface CSVImportResult {
  success: boolean;
  message: string;
  importedProducts: number;
  createdCategories: number;
  errors: string[];
}

// Estrutura esperada do CSV
export const CSV_STRUCTURE = {
  headers: [
    'name',
    'description', 
    'price',
    'category',
    'preparationTime',
    'available',
    'name_en',
    'name_es', 
    'name_fr',
    'description_en',
    'description_es',
    'description_fr'
  ],
  required: ['name', 'description', 'price', 'category'],
  optional: ['preparationTime', 'available', 'name_en', 'name_es', 'name_fr', 'description_en', 'description_es', 'description_fr']
};

// Função para validar e processar o CSV
export const processCSV = (csvText: string): CSVProduct[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV deve ter pelo menos um cabeçalho e uma linha de dados');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const products: CSVProduct[] = [];

  // Validar cabeçalhos obrigatórios
  const requiredHeaders = CSV_STRUCTURE.required;
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Cabeçalho obrigatório não encontrado: ${required}`);
    }
  }

  // Processar linhas de dados
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Pular linhas vazias

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Linha ${i + 1}: número de colunas não corresponde ao cabeçalho`);
    }

    const product: any = {};
    headers.forEach((header, index) => {
      product[header] = values[index]?.trim() || '';
    });

    // Validar e converter valores
    const validatedProduct: CSVProduct = {
      name: product.name,
      description: product.description,
      price: parseFloat(product.price) || 0,
      category: product.category,
      preparationTime: product.preparationTime && product.preparationTime.trim() ? parseInt(product.preparationTime) : undefined,
      available: product.available === 'true' || product.available === 'True' || product.available === '1' || product.available === '',
      name_en: product.name_en,
      name_es: product.name_es,
      name_fr: product.name_fr,
      description_en: product.description_en,
      description_es: product.description_es,
      description_fr: product.description_fr
    };

    // Validações básicas
    if (!validatedProduct.name) {
      throw new Error(`Linha ${i + 1}: nome do produto é obrigatório`);
    }
    if (!validatedProduct.description) {
      throw new Error(`Linha ${i + 1}: descrição do produto é obrigatória`);
    }
    if (validatedProduct.price <= 0) {
      throw new Error(`Linha ${i + 1}: preço deve ser maior que zero`);
    }
    if (!validatedProduct.category) {
      throw new Error(`Linha ${i + 1}: categoria é obrigatória`);
    }

    products.push(validatedProduct);
  }

  return products;
};

// Função para processar valores CSV (lidar com vírgulas dentro de aspas)
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(value => value.replace(/^"|"$/g, '')); // Remove aspas externas
};

// Função para criar categorias que não existem
const ensureCategoriesExist = async (categories: string[]): Promise<number> => {
  const existingCategories = await getCategories();
  const existingCategoryNames = existingCategories.map(c => c.name.toLowerCase());
  let createdCount = 0;

  for (const categoryName of categories) {
    if (!existingCategoryNames.includes(categoryName.toLowerCase())) {
      try {
        await addCategory(categoryName);
        createdCount++;
        console.log(`Categoria criada: ${categoryName}`);
      } catch (error) {
        console.error(`Erro ao criar categoria ${categoryName}:`, error);
      }
    }
  }

  return createdCount;
};

// Função principal para importar produtos do CSV
export const importProductsFromCSV = async (csvText: string): Promise<CSVImportResult> => {
  const result: CSVImportResult = {
    success: false,
    message: '',
    importedProducts: 0,
    createdCategories: 0,
    errors: []
  };

  try {
    // Testar conectividade com o Firebase
    console.log('Testando conectividade com Firebase...');
    console.log('Firebase db disponível:', !!db);
    
    // Processar CSV
    const csvProducts = processCSV(csvText);
    
    if (csvProducts.length === 0) {
      result.message = 'Nenhum produto encontrado no CSV';
      return result;
    }

    // Extrair categorias únicas
    const uniqueCategories = [...new Set(csvProducts.map(p => p.category))];
    
    // Criar categorias que não existem
    result.createdCategories = await ensureCategoriesExist(uniqueCategories);

    // Importar produtos
    for (const csvProduct of csvProducts) {
      let productData: any = null;
      
      try {
        console.log(`Tentando importar produto: ${csvProduct.name}`);
        
        // Preparar dados do produto
        productData = {
          name: csvProduct.name,
          description: csvProduct.description,
          price: csvProduct.price,
          category: csvProduct.category,
          available: csvProduct.available,
          image: '' // Campo obrigatório
        };

        // Adicionar preparationTime apenas se não for undefined
        if (csvProduct.preparationTime !== undefined) {
          productData.preparationTime = csvProduct.preparationTime;
        }

        // Adicionar traduções se existirem
        const translations: any = {};
        if (csvProduct.name_en || csvProduct.name_es || csvProduct.name_fr) {
          translations.name = {};
          if (csvProduct.name_en) translations.name['en-US'] = csvProduct.name_en;
          if (csvProduct.name_es) translations.name['es-ES'] = csvProduct.name_es;
          if (csvProduct.name_fr) translations.name['fr-FR'] = csvProduct.name_fr;
        }

        if (csvProduct.description_en || csvProduct.description_es || csvProduct.description_fr) {
          translations.description = {};
          if (csvProduct.description_en) translations.description['en-US'] = csvProduct.description_en;
          if (csvProduct.description_es) translations.description['es-ES'] = csvProduct.description_es;
          if (csvProduct.description_fr) translations.description['fr-FR'] = csvProduct.description_fr;
        }

        if (Object.keys(translations).length > 0) {
          productData.translations = translations;
        }

        // Adicionar produto
        console.log('Dados do produto a serem enviados:', productData);
        await addProduct(productData);
        result.importedProducts++;
        console.log(`Produto importado: ${csvProduct.name}`);

      } catch (error) {
        const errorMsg = `Erro ao importar produto "${csvProduct.name}": ${error}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
        if (productData) {
          console.error('Dados do produto que falhou:', productData);
        }
      }
    }

    result.success = true;
    result.message = `Importação concluída! ${result.importedProducts} produtos importados, ${result.createdCategories} categorias criadas.`;
    
    if (result.errors.length > 0) {
      result.message += ` ${result.errors.length} erro(s) encontrado(s).`;
    }

  } catch (error) {
    result.message = `Erro ao processar CSV: ${error}`;
    result.errors.push(result.message);
  }

  return result;
};

// Função para gerar template CSV
export const generateCSVTemplate = (): string => {
  const headers = CSV_STRUCTURE.headers.join(',');
  const exampleRow = [
    'Hambúrguer Clássico',
    'Hambúrguer artesanal com queijo, alface e tomate',
    '25.90',
    'Lanches',
    '15',
    'true',
    'Classic Burger',
    'Hamburguesa Clásica',
    'Burger Classique',
    'Artisanal burger with cheese, lettuce and tomato',
    'Hamburguesa artesanal con queso, lechuga y tomate',
    'Burger artisanale avec fromage, laitue et tomate'
  ].join(',');

  return `${headers}\n${exampleRow}`;
};

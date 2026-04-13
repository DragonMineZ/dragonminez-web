import * as CategoryRepo from "../repositories/category.repository";

export async function getAllCategories() {
    return CategoryRepo.findAllCategories();
}
